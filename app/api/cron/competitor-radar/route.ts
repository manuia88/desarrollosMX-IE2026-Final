// Cron biz · competitor-radar
// FASE 15.E.9 GC-88 — Competitor Radar daily.
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: vercel.json `0 4 * * *` (4am UTC).
// H1 baseline: para cada monitor activo, detecta cambios de precio del competitor_proyecto_id
// (cuando es proyecto interno DMX) y emite competitor_alert. Para monitores externos (URL/name),
// emite alerta sintética semanal de "cambio detectado" con AI narrative stub.
// Full scrape externo + Meta Ad Library API queda como STUB ADR-018 (4 señales) — agendado L-NEW-RADAR-EXTERNAL-SCRAPE.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_competitor_radar_daily';
const COUNTRY_CODE = 'MX';
const PRICE_DELTA_THRESHOLD_PCT = 2;

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const received = request.headers.get('authorization');
  return received === `Bearer ${expected}`;
}

interface MonitorRow {
  readonly id: string;
  readonly my_proyecto_id: string;
  readonly competitor_proyecto_id: string | null;
  readonly competitor_external_name: string | null;
  readonly competitor_external_url: string | null;
  readonly metrics_tracked: unknown;
  readonly last_checked_at: string | null;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  const { data: runRow, error: insertErr } = await supabase
    .from('ingest_runs')
    .insert({
      source: SOURCE,
      country_code: COUNTRY_CODE,
      status: 'started',
      rows_inserted: 0,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      started_at: startedAt,
      triggered_by: 'cron',
      meta: { cron: 'competitor-radar' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'competitor-radar', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id as string;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;
  let monitorsProcessed = 0;
  let alertsCreated = 0;

  try {
    const { data: monitors } = await supabase
      .from('competitor_monitors')
      .select(
        'id, my_proyecto_id, competitor_proyecto_id, competitor_external_name, competitor_external_url, metrics_tracked, last_checked_at',
      )
      .eq('active', true);

    const now = new Date();
    for (const m of (monitors ?? []) as MonitorRow[]) {
      monitorsProcessed += 1;
      const tracked = Array.isArray(m.metrics_tracked) ? (m.metrics_tracked as string[]) : [];

      if (m.competitor_proyecto_id) {
        const detection = await detectInternalChange(
          supabase,
          m.competitor_proyecto_id,
          m.last_checked_at,
          tracked,
        );
        for (const alert of detection) {
          const { error: aErr } = await supabase.from('competitor_alerts').insert({
            monitor_id: m.id,
            alert_type: alert.alert_type,
            severity: alert.severity,
            payload: alert.payload as never,
            ai_narrative: alert.ai_narrative,
          } as never);
          if (!aErr) alertsCreated += 1;
        }
      } else if (m.competitor_external_name) {
        const lastChecked = m.last_checked_at ? new Date(m.last_checked_at).getTime() : 0;
        const daysSince = (now.getTime() - lastChecked) / (1000 * 60 * 60 * 24);
        if (daysSince >= 7) {
          const { error: aErr } = await supabase.from('competitor_alerts').insert({
            monitor_id: m.id,
            alert_type: 'price_change',
            severity: 'low',
            payload: {
              source: 'external_stub',
              note: 'STUB ADR-018 — scraping externo Meta Ad Library/web crawl pendiente L-NEW-RADAR-EXTERNAL-SCRAPE.',
            } as never,
            ai_narrative: `Revisión periódica del competidor "${m.competitor_external_name}". Configura URL para análisis automatizado.`,
          } as never);
          if (!aErr) alertsCreated += 1;
        }
      }

      await supabase
        .from('competitor_monitors')
        .update({ last_checked_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('id', m.id);
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, { tags: { cron: 'competitor-radar', stage: 'detect_loop' } });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        completed_at: completedAt,
        duration_ms: durationMs,
        rows_inserted: alertsCreated,
        error: resultError,
        meta: { cron: 'competitor-radar', monitors_processed: monitorsProcessed },
      } as never)
      .eq('id', runId);
  }

  if (resultStatus === 'error') {
    return NextResponse.json(
      { ok: false, error: resultError ?? 'unknown_error', run_id: runId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    run_id: runId,
    monitors_processed: monitorsProcessed,
    alerts_created: alertsCreated,
  });
}

interface DetectedAlert {
  readonly alert_type: 'price_change' | 'inventory_change' | 'avance_change';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly payload: Record<string, unknown>;
  readonly ai_narrative: string;
}

async function detectInternalChange(
  supabase: ReturnType<typeof createAdminClient>,
  competitorProyectoId: string,
  lastCheckedAt: string | null,
  tracked: readonly string[],
): Promise<readonly DetectedAlert[]> {
  const alerts: DetectedAlert[] = [];
  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('id, nombre, price_min_mxn, price_max_mxn, units_available, units_total, updated_at')
    .eq('id', competitorProyectoId)
    .maybeSingle();
  if (!proyecto) return alerts;

  if (lastCheckedAt && new Date(proyecto.updated_at) <= new Date(lastCheckedAt)) {
    return alerts;
  }

  if (
    tracked.includes('price') &&
    proyecto.price_min_mxn !== null &&
    proyecto.price_max_mxn !== null
  ) {
    const { data: priorRow } = await supabase
      .from('unit_change_log')
      .select('payload, occurred_at')
      .eq('event_type', 'price_changed')
      .order('occurred_at', { ascending: false })
      .limit(50);

    const recent = (priorRow ?? []).find((r) => {
      const pl = (r.payload ?? {}) as { project_id?: string };
      return pl.project_id === competitorProyectoId;
    });
    if (recent) {
      const pl = (recent.payload ?? {}) as { old_price?: number; new_price?: number };
      const oldP = Number(pl.old_price ?? 0);
      const newP = Number(pl.new_price ?? 0);
      if (oldP > 0 && newP > 0) {
        const deltaPct = ((newP - oldP) / oldP) * 100;
        if (Math.abs(deltaPct) >= PRICE_DELTA_THRESHOLD_PCT) {
          alerts.push({
            alert_type: 'price_change',
            severity: Math.abs(deltaPct) >= 5 ? 'high' : 'medium',
            payload: {
              competitor_id: competitorProyectoId,
              old_price: oldP,
              new_price: newP,
              delta_pct: Number(deltaPct.toFixed(2)),
            },
            ai_narrative: `${proyecto.nombre} ${deltaPct < 0 ? 'bajó' : 'subió'} precio ${Math.abs(deltaPct).toFixed(1)}%.`,
          });
        }
      }
    }
  }

  if (
    tracked.includes('inventory') &&
    proyecto.units_available !== null &&
    proyecto.units_total !== null
  ) {
    const ratio = proyecto.units_total > 0 ? proyecto.units_available / proyecto.units_total : 0;
    if (ratio < 0.15) {
      alerts.push({
        alert_type: 'inventory_change',
        severity: 'medium',
        payload: {
          competitor_id: competitorProyectoId,
          units_available: proyecto.units_available,
          units_total: proyecto.units_total,
          ratio: Number(ratio.toFixed(3)),
        },
        ai_narrative: `${proyecto.nombre} con ${proyecto.units_available} unidades disponibles (${(ratio * 100).toFixed(0)}% del total) — riesgo de sold-out.`,
      });
    }
  }

  return alerts;
}
