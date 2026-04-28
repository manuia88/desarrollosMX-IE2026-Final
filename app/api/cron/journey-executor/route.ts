// Cron biz · journey-executor (B.7 FASE 15 v3 onyx-benchmarked, anchor -30% ciclo ventas)
// Reference: ADR-060 + 03.7 cron canon append v3.
//
// Schedule: vercel.json `*/15 * * * *` (every 15 minutes — fast feedback loop).
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Observability: ingest_runs INSERT fail-fast (memoria cron_observability_obligatorio).

import { NextResponse } from 'next/server';
import { executeJourneyTick } from '@/shared/lib/journeys/executor';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_journey_executor';
const COUNTRY_CODE = 'MX';
const BATCH_LIMIT = 100;

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
      meta: { cron: 'journey-executor', batch_limit: BATCH_LIMIT },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'journey-executor', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let advanced = 0;
  let waiting = 0;
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;

  try {
    const results = await executeJourneyTick({ supabase }, BATCH_LIMIT);
    for (const r of results) {
      if (r.outcome === 'advanced') advanced++;
      else if (r.outcome === 'wait') waiting++;
      else if (r.outcome === 'completed') completed++;
      else if (r.outcome === 'failed') failed++;
      else if (r.outcome === 'skipped') skipped++;
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'journey-executor', stage: 'main_loop' },
    });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        rows_updated: advanced + waiting + completed,
        rows_skipped: skipped,
        rows_dlq: failed,
        completed_at: completedAt,
        duration_ms: durationMs,
        error: resultError,
        meta: {
          cron: 'journey-executor',
          advanced,
          waiting,
          completed,
          failed,
          skipped,
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
    advanced,
    waiting,
    completed,
    failed,
    skipped,
    run_id: runId,
  });
}
