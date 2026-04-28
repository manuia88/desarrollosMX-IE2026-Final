// Cron biz · dynamic-pricing
// FASE 15.E.8 GC-87 — Dynamic Pricing daily.
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: vercel.json `0 2 * * *` (2am UTC).
// Loop unidades disponibles → calcula B03 sugerencia → INSERT dynamic_pricing_suggestions.
// Auto-apply guard: solo cuando proyectos.meta.dynamic_pricing_auto_apply === true,
// y delta absoluto ≤ 3% (ADR-060 §15.E.8 criterio done).

import { NextResponse } from 'next/server';
import { computeB03PricingAutopilot } from '@/shared/lib/intelligence-engine/calculators/n2/b03-pricing-autopilot';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_dynamic_pricing_daily';
const COUNTRY_CODE = 'MX';
const MAX_AUTO_APPLY_DELTA_PCT = 3;

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const received = request.headers.get('authorization');
  return received === `Bearer ${expected}`;
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
      meta: { cron: 'dynamic-pricing' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'dynamic-pricing', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id as string;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;
  let inserted = 0;
  let auto_applied = 0;
  let projectsProcessed = 0;

  try {
    const { data: proyectos } = await supabase
      .from('proyectos')
      .select('id, country_code, meta')
      .eq('is_active', true);

    for (const proyecto of proyectos ?? []) {
      const { data: unidades } = await supabase
        .from('unidades')
        .select('id, price_mxn, status, demand_signals, created_at')
        .eq('proyecto_id', proyecto.id)
        .eq('status', 'disponible');

      const activas = (unidades ?? []).filter((u) => u.price_mxn !== null && u.price_mxn > 0);
      if (activas.length === 0) continue;
      projectsProcessed += 1;

      const compute = computeB03PricingAutopilot({
        projectId: proyecto.id,
        unidades: activas.map((u) => {
          const created = u.created_at ? new Date(u.created_at).getTime() : Date.now();
          const dias = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
          const ds = (u.demand_signals ?? {}) as { absorcion_mensual?: number };
          const absorcion =
            typeof ds.absorcion_mensual === 'number' && ds.absorcion_mensual >= 0
              ? ds.absorcion_mensual
              : 1.5;
          return {
            unidadId: u.id,
            precio_actual: Number(u.price_mxn),
            dias_en_mercado: dias,
            absorcion_mensual: absorcion,
          };
        }),
        momentum_zona: 60,
        demanda_alta: false,
      });

      const meta = (proyecto.meta ?? {}) as { dynamic_pricing_auto_apply?: boolean };
      const autoApply = meta.dynamic_pricing_auto_apply === true;

      for (const s of compute.components.unidades) {
        if (s.accion === 'mantener') continue;
        const { error: insErr } = await supabase.from('dynamic_pricing_suggestions').insert({
          unidad_id: s.unidadId,
          current_price_mxn: s.precio_actual,
          suggested_price_mxn: s.precio_sugerido,
          delta_pct: s.delta_pct,
          reasoning: s.rationale,
          confidence: compute.confidence,
        } as never);
        if (!insErr) inserted += 1;

        if (autoApply && Math.abs(s.delta_pct) <= MAX_AUTO_APPLY_DELTA_PCT) {
          await supabase
            .from('unidades')
            .update({ price_mxn: s.precio_sugerido, updated_at: new Date().toISOString() })
            .eq('id', s.unidadId);
          await supabase
            .from('dynamic_pricing_suggestions')
            .update({
              applied: true,
              applied_at: new Date().toISOString(),
            })
            .eq('unidad_id', s.unidadId)
            .eq('applied', false);
          await supabase.from('unit_change_log').insert({
            unidad_id: s.unidadId,
            actor_id: null,
            event_type: 'price_changed',
            payload: {
              source: 'cron_dynamic_pricing',
              old_price: s.precio_actual,
              new_price: s.precio_sugerido,
              delta_pct: s.delta_pct,
            },
          });
          auto_applied += 1;
        }
      }
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, { tags: { cron: 'dynamic-pricing', stage: 'compute_loop' } });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        completed_at: completedAt,
        duration_ms: durationMs,
        rows_inserted: inserted,
        rows_updated: auto_applied,
        error: resultError,
        meta: { cron: 'dynamic-pricing', projects_processed: projectsProcessed },
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
    inserted,
    auto_applied,
    projects_processed: projectsProcessed,
  });
}
