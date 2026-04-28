// Cron biz · lead-score-recompute-hourly (B.6 FASE 15 v3 onyx-benchmarked)
// Reference: ADR-060 + 03.7 cron canon append v3 (anchor 21x conv <5min response)
//
// Auth: Authorization: Bearer ${CRON_SECRET} — patrón estándar Vercel crons.
// Schedule: vercel.json `0 * * * *` (every hour).
// Observability: ingest_runs INSERT fail-fast (memoria cron_observability_obligatorio).

import { NextResponse } from 'next/server';
import { batchComputeStaleLeadScores } from '@/shared/lib/scores/c01-lead-score';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_lead_score_recompute_hourly';
const COUNTRY_CODE = 'MX';
const BATCH_LIMIT = 200;

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
      meta: { cron: 'lead-score-recompute-hourly', batch_limit: BATCH_LIMIT },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'lead-score-recompute-hourly', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let rowsUpdated = 0;
  let hotCount = 0;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;

  try {
    const results = await batchComputeStaleLeadScores({ supabase }, BATCH_LIMIT);
    for (const r of results) {
      rowsUpdated++;
      if (r.tier === 'hot') hotCount++;
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'lead-score-recompute-hourly', stage: 'main_loop' },
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
          cron: 'lead-score-recompute-hourly',
          leads_recomputed: rowsUpdated,
          hot_count: hotCount,
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
    leads_recomputed: rowsUpdated,
    hot_count: hotCount,
    run_id: runId,
  });
}
