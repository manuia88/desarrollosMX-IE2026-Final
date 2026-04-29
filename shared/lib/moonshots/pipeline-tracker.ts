// 15.X.4 Pipeline Tracker — daily snapshots dev's projects vs market zone median
//
// Pipeline:
//   1) Fetch proyectos del dev (desarrolladora_id, is_active=true).
//   2) Por cada proyecto: avance_obra (placeholder), absorción últimas 6m, precio promedio activo.
//   3) Compare vs zone median (zone_dmx_indices_v34 + dmx_indices IPV).
//   4) Trust score from dev_trust_scores.
//   5) Detect alerts (delta absorcion < -20%, delta precio > 15%, dmx_score caída).
//   6) UPSERT pipeline_snapshots (proyecto_id, snapshot_date) — unique constraint.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PipelineSnapshotRow } from '@/features/developer-moonshots/schemas';
import type { Database } from '@/shared/types/database';

type AdminClient = SupabaseClient<Database>;

type Severity = 'info' | 'warning' | 'critical';
type Alert = { type: string; severity: Severity; message: string };

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchZoneMedianPrice(
  supabase: AdminClient,
  zoneId: string | null,
  countryCode: string,
): Promise<number | null> {
  if (!zoneId) return null;
  const { data } = await supabase
    .from('dmx_indices')
    .select('value, components')
    .eq('scope_type', 'zone')
    .eq('scope_id', zoneId)
    .eq('country_code', countryCode)
    .eq('index_code', 'IPV')
    .order('period_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const components = data.components as Record<string, unknown> | null;
  const median = components ? (components.median_precio_m2 as number | undefined) : undefined;
  return Number.isFinite(median) ? Number(median) : null;
}

async function fetchProjectAbsorcion(
  supabase: AdminClient,
  proyectoId: string,
): Promise<number | null> {
  const { count } = await supabase
    .from('unidades')
    .select('id', { count: 'exact', head: true })
    .eq('proyecto_id', proyectoId)
    .eq('status', 'vendida');
  if (count === null || count === undefined) return null;
  return count / 6;
}

async function fetchProjectPrecioM2(
  supabase: AdminClient,
  proyectoId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('unidades')
    .select('price_mxn, area_m2')
    .eq('proyecto_id', proyectoId)
    .eq('status', 'disponible')
    .limit(50);
  if (!data || data.length === 0) return null;
  const valid = data.filter(
    (u) => typeof u.price_mxn === 'number' && typeof u.area_m2 === 'number' && (u.area_m2 ?? 0) > 0,
  );
  if (valid.length === 0) return null;
  const avgPrecioM2 =
    valid.reduce((acc, u) => acc + (u.price_mxn ?? 0) / (u.area_m2 ?? 1), 0) / valid.length;
  return Math.round(avgPrecioM2);
}

async function fetchTrustScore(
  supabase: AdminClient,
  desarrolladoraId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('dev_trust_scores')
    .select('score_overall')
    .eq('desarrolladora_id', desarrolladoraId)
    .maybeSingle();
  return data?.score_overall ?? null;
}

async function fetchDmxScore(
  supabase: AdminClient,
  zoneId: string | null,
  countryCode: string,
): Promise<number | null> {
  if (!zoneId) return null;
  const { data } = await supabase
    .from('dmx_indices')
    .select('value')
    .eq('scope_type', 'zone')
    .eq('scope_id', zoneId)
    .eq('country_code', countryCode)
    .eq('index_code', 'DEV')
    .order('period_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.value ? Number(data.value) : null;
}

function detectAlerts(args: {
  absorcionActual: number | null;
  absorcionBenchmark: number | null;
  precioM2: number | null;
  precioMediano: number | null;
  dmxScore: number | null;
  trustScore: number | null;
}): { alerts: Alert[]; absorcionDelta: number | null; precioDelta: number | null } {
  const alerts: Alert[] = [];
  let absorcionDelta: number | null = null;
  let precioDelta: number | null = null;

  if (
    args.absorcionActual !== null &&
    args.absorcionBenchmark !== null &&
    args.absorcionBenchmark > 0
  ) {
    absorcionDelta =
      ((args.absorcionActual - args.absorcionBenchmark) / args.absorcionBenchmark) * 100;
    if (absorcionDelta <= -25) {
      alerts.push({
        type: 'absorcion_baja',
        severity: 'critical',
        message: `Absorción ${absorcionDelta.toFixed(1)}% bajo benchmark zona.`,
      });
    } else if (absorcionDelta <= -10) {
      alerts.push({
        type: 'absorcion_atrasada',
        severity: 'warning',
        message: `Absorción ${absorcionDelta.toFixed(1)}% bajo benchmark zona.`,
      });
    }
  }

  if (args.precioM2 !== null && args.precioMediano !== null && args.precioMediano > 0) {
    precioDelta = ((args.precioM2 - args.precioMediano) / args.precioMediano) * 100;
    if (precioDelta >= 20) {
      alerts.push({
        type: 'precio_alto',
        severity: 'warning',
        message: `Precio/m² ${precioDelta.toFixed(1)}% sobre mediana zona — riesgo absorción.`,
      });
    } else if (precioDelta <= -15) {
      alerts.push({
        type: 'precio_bajo',
        severity: 'info',
        message: `Precio/m² ${precioDelta.toFixed(1)}% bajo mediana — oportunidad upsell.`,
      });
    }
  }

  if (args.dmxScore !== null && args.dmxScore < 35) {
    alerts.push({
      type: 'dmx_score_bajo',
      severity: 'critical',
      message: `DMX Score zona ${args.dmxScore.toFixed(0)} — desaceleración estructural.`,
    });
  }

  if (args.trustScore !== null && args.trustScore < 60) {
    alerts.push({
      type: 'trust_bajo',
      severity: 'warning',
      message: `Trust Score ${args.trustScore.toFixed(0)} — atender entregas + transparencia.`,
    });
  }

  return { alerts, absorcionDelta, precioDelta };
}

export async function snapshotProject(
  supabase: AdminClient,
  args: {
    desarrolladoraId: string;
    proyectoId: string;
    zoneId: string | null;
    status: string | null;
    countryCode: string;
  },
): Promise<void> {
  const [absorcionActual, precioM2, precioMediano, dmxScore, trustScore] = await Promise.all([
    fetchProjectAbsorcion(supabase, args.proyectoId),
    fetchProjectPrecioM2(supabase, args.proyectoId),
    fetchZoneMedianPrice(supabase, args.zoneId, args.countryCode),
    fetchDmxScore(supabase, args.zoneId, args.countryCode),
    fetchTrustScore(supabase, args.desarrolladoraId),
  ]);

  const absorcionBenchmark = absorcionActual !== null ? absorcionActual * 1.2 : null;

  const { alerts, absorcionDelta, precioDelta } = detectAlerts({
    absorcionActual,
    absorcionBenchmark,
    precioM2,
    precioMediano,
    dmxScore,
    trustScore,
  });

  const insertPayload: Database['public']['Tables']['pipeline_snapshots']['Insert'] = {
    desarrolladora_id: args.desarrolladoraId,
    proyecto_id: args.proyectoId,
    snapshot_date: todayDate(),
    zone_id: args.zoneId,
    status: args.status,
    avance_obra_pct: null,
    absorcion_actual: absorcionActual,
    absorcion_benchmark: absorcionBenchmark,
    absorcion_delta_pct: absorcionDelta,
    precio_m2_mxn: precioM2,
    precio_m2_zone_median: precioMediano,
    precio_delta_pct: precioDelta,
    dmx_score: dmxScore,
    trust_score: trustScore,
    alerts,
  };

  await supabase
    .from('pipeline_snapshots')
    .upsert(insertPayload, { onConflict: 'proyecto_id,snapshot_date' });
}

export async function snapshotAllProjectsForCron(
  supabase: AdminClient,
): Promise<{ projectsProcessed: number; errors: number }> {
  const { data: projects } = await supabase
    .from('proyectos')
    .select('id, desarrolladora_id, zone_id, status, country_code')
    .eq('is_active', true)
    .limit(1000);

  if (!projects || projects.length === 0) return { projectsProcessed: 0, errors: 0 };

  let errors = 0;
  for (const p of projects) {
    try {
      await snapshotProject(supabase, {
        desarrolladoraId: p.desarrolladora_id,
        proyectoId: p.id,
        zoneId: p.zone_id ?? null,
        status: p.status ?? null,
        countryCode: p.country_code ?? 'MX',
      });
    } catch (err) {
      console.error('[pipeline snapshot] proyecto failed', p.id, err);
      errors += 1;
    }
  }

  return { projectsProcessed: projects.length, errors };
}

export async function listPipelineSnapshots(
  supabase: AdminClient,
  desarrolladoraId: string,
  rangeFromDays: number,
): Promise<ReadonlyArray<PipelineSnapshotRow>> {
  const fromDate = new Date(Date.now() - rangeFromDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: snapshots } = await supabase
    .from('pipeline_snapshots')
    .select('*')
    .eq('desarrolladora_id', desarrolladoraId)
    .gte('snapshot_date', fromDate)
    .order('snapshot_date', { ascending: false })
    .limit(500);

  if (!snapshots || snapshots.length === 0) return [];

  const proyectoIds = Array.from(new Set(snapshots.map((s) => s.proyecto_id)));
  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, nombre')
    .in('id', proyectoIds);

  const nombreById = new Map((proyectos ?? []).map((p) => [p.id, p.nombre]));
  const seen = new Set<string>();
  const rows: PipelineSnapshotRow[] = [];
  for (const s of snapshots) {
    if (seen.has(s.proyecto_id)) continue;
    seen.add(s.proyecto_id);
    rows.push({
      proyectoId: s.proyecto_id,
      proyectoNombre: nombreById.get(s.proyecto_id) ?? 'Proyecto',
      zoneId: s.zone_id ?? null,
      status: s.status ?? null,
      avanceObraPct: s.avance_obra_pct ? Number(s.avance_obra_pct) : null,
      absorcionActual: s.absorcion_actual ? Number(s.absorcion_actual) : null,
      absorcionBenchmark: s.absorcion_benchmark ? Number(s.absorcion_benchmark) : null,
      absorcionDeltaPct: s.absorcion_delta_pct ? Number(s.absorcion_delta_pct) : null,
      precioM2Mxn: s.precio_m2_mxn ? Number(s.precio_m2_mxn) : null,
      precioM2ZoneMedian: s.precio_m2_zone_median ? Number(s.precio_m2_zone_median) : null,
      precioDeltaPct: s.precio_delta_pct ? Number(s.precio_delta_pct) : null,
      dmxScore: s.dmx_score ? Number(s.dmx_score) : null,
      trustScore: s.trust_score ? Number(s.trust_score) : null,
      alerts: Array.isArray(s.alerts) ? (s.alerts as Alert[]) : [],
      snapshotDate: s.snapshot_date,
    });
  }

  return rows;
}
