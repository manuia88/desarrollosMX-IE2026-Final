// Cron biz · unit-demand-score-daily (B.2 FASE 15 v3 onyx-benchmarked)
// Reference: ADR-060 + 03.7 cron canon append v3
//
// Auth: Authorization: Bearer ${CRON_SECRET} — patrón estándar Vercel crons.
// Schedule: vercel.json `0 3 * * *` (3am UTC daily).
// Observability: ingest_runs INSERT fail-fast (memoria cron_observability_obligatorio).

import { NextResponse } from 'next/server';
import {
  batchComputeProjectDemandScores,
  persistUnitDemandScore,
} from '@/shared/lib/scores/unit-demand-score';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_unit_demand_score_daily';
const COUNTRY_CODE = 'MX';

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
      meta: { cron: 'unit-demand-score-daily' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'unit-demand-score-daily', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let rowsUpdated = 0;
  let projectsProcessed = 0;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;

  try {
    const { data: projects, error: projErr } = await supabase
      .from('proyectos')
      .select('id')
      .eq('is_active', true);

    if (projErr) {
      throw new Error(`proyectos_query_failed: ${projErr.message}`);
    }

    for (const project of projects ?? []) {
      try {
        const results = await batchComputeProjectDemandScores(project.id, { supabase });
        for (const result of results) {
          await persistUnitDemandScore(result, { supabase });
          rowsUpdated++;
        }
        projectsProcessed++;
      } catch (projErr) {
        sentry.captureException(projErr, {
          tags: { cron: 'unit-demand-score-daily', stage: 'project_loop', project_id: project.id },
        });
      }
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'unit-demand-score-daily', stage: 'main_loop' },
    });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        rows_updated: rowsUpdated,
        completed_at: completedAt,
        duration_ms: durationMs,
        error: resultError,
        meta: {
          cron: 'unit-demand-score-daily',
          projects_processed: projectsProcessed,
          units_updated: rowsUpdated,
        },
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
    projects_processed: projectsProcessed,
    units_updated: rowsUpdated,
    run_id: runId,
  });
}
