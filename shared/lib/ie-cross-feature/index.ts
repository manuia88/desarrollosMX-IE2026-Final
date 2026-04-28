// ADR-055 — Studio cross-feature IE DMX integration.
// Read-only API sobre IE DMX scores + market data + suggested zones.
// Consumido por features/dmx-studio/ Sprint 7 + futuras features (M02, M08).

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface ZoneScoresSnapshot {
  readonly pulse: number | null;
  readonly futures: number | null;
  readonly ghost: number | null;
  readonly alpha: number | null;
  readonly capturedAt: string;
}

export interface ZoneMarketData {
  readonly precioPromedioM2: number | null;
  readonly trend30dPct: number | null;
  readonly amenidadesDestacadas: ReadonlyArray<string>;
  readonly occupancyRateStr: number | null;
  readonly adrStr: number | null;
  readonly capturedAt: string;
}

export interface SuggestedZone {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly reason: string;
  readonly score: number;
}

export async function getZoneScores(zoneId: string): Promise<ZoneScoresSnapshot> {
  const supabase = createAdminClient();

  const { data: zoneRow } = await supabase
    .from('zones')
    .select('scope_id, scope_type, country_code')
    .eq('id', zoneId)
    .maybeSingle();

  let pulse: number | null = null;
  if (zoneRow?.scope_id) {
    const { data: pulseData } = await supabase
      .from('zone_pulse_scores')
      .select('pulse_score')
      .eq('scope_id', zoneRow.scope_id)
      .order('period_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    pulse = pulseData?.pulse_score ?? null;
  }

  const { data: scoresData } = await supabase
    .from('zone_scores')
    .select('score_type, score_value')
    .eq('zone_id', zoneId)
    .order('period_date', { ascending: false })
    .limit(20);

  const scoreMap = new Map<string, number>();
  for (const row of scoresData ?? []) {
    if (row.score_type && typeof row.score_value === 'number' && !scoreMap.has(row.score_type)) {
      scoreMap.set(row.score_type, row.score_value);
    }
  }

  return {
    pulse,
    futures: scoreMap.get('futures_alpha') ?? null,
    ghost: scoreMap.get('ghost') ?? null,
    alpha: scoreMap.get('zone_alpha') ?? null,
    capturedAt: new Date().toISOString(),
  };
}

export async function getZoneMarketData(zoneId: string): Promise<ZoneMarketData> {
  const supabase = createAdminClient();
  const { data: zonaData } = await supabase
    .from('zona_snapshots')
    .select('payload')
    .eq('zone_id', zoneId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = (zonaData?.payload as Record<string, unknown> | null) ?? {};
  const precio = pickNumber(payload, 'precio_promedio_m2');
  const trend = pickNumber(payload, 'trend_30d_pct');
  const amenidades = pickStringArray(payload, 'amenidades_destacadas');

  const { data: pulseRows } = await supabase
    .from('market_pulse')
    .select('metric, value, period_start')
    .eq('zone_id', zoneId)
    .in('metric', ['occupancy_rate', 'adr'])
    .order('period_start', { ascending: false })
    .limit(20);

  let occupancy: number | null = null;
  let adr: number | null = null;
  for (const row of pulseRows ?? []) {
    if (row.metric === 'occupancy_rate' && occupancy === null) occupancy = Number(row.value);
    if (row.metric === 'adr' && adr === null) adr = Number(row.value);
  }

  return {
    precioPromedioM2: precio,
    trend30dPct: trend,
    amenidadesDestacadas: amenidades,
    occupancyRateStr: occupancy,
    adrStr: adr,
    capturedAt: new Date().toISOString(),
  };
}

export async function suggestZonesForAsesor(userId: string): Promise<ReadonlyArray<SuggestedZone>> {
  const supabase = createAdminClient();

  const { data: leadsZones } = await supabase
    .from('leads')
    .select('zone_id, status')
    .eq('assigned_asesor_id', userId)
    .limit(500);

  const opCount = new Map<string, number>();
  const leadCount = new Map<string, number>();

  for (const row of leadsZones ?? []) {
    const zid = row.zone_id;
    if (!zid) continue;
    if (row.status === 'converted') {
      opCount.set(zid, (opCount.get(zid) ?? 0) + 1);
    } else {
      leadCount.set(zid, (leadCount.get(zid) ?? 0) + 1);
    }
  }

  const scores = new Map<string, number>();
  const zoneIds = new Set<string>([...opCount.keys(), ...leadCount.keys()]);
  for (const zid of zoneIds) {
    const ops = opCount.get(zid) ?? 0;
    const leads = leadCount.get(zid) ?? 0;
    scores.set(zid, ops * 3 + leads);
  }

  if (scores.size === 0) return [];

  const top3 = Array.from(scores.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const { data: zonesData } = await supabase
    .from('zones')
    .select('id, name_es')
    .in(
      'id',
      top3.map(([id]) => id),
    );

  const nameMap = new Map<string, string>();
  for (const z of zonesData ?? []) {
    if (z.id && z.name_es) nameMap.set(z.id, z.name_es);
  }

  return top3.map(([zoneId, score]) => {
    const ops = opCount.get(zoneId) ?? 0;
    const leads = leadCount.get(zoneId) ?? 0;
    const reason =
      ops > 0 && leads > 0
        ? `${ops} cierre(s) + ${leads} prospecto(s) en zona`
        : ops > 0
          ? `${ops} cierre(s) en zona`
          : `${leads} prospecto(s) activo(s) en zona`;
    return {
      zoneId,
      zoneName: nameMap.get(zoneId) ?? 'Zona desconocida',
      reason,
      score,
    };
  });
}

function pickNumber(payload: Record<string, unknown>, key: string): number | null {
  const v = payload[key];
  return typeof v === 'number' ? v : null;
}

function pickStringArray(payload: Record<string, unknown>, key: string): ReadonlyArray<string> {
  const v = payload[key];
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === 'string');
}
