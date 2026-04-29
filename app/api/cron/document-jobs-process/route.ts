// Cron biz · document-jobs-process
// FASE 17.B — pipeline AI extraction loop.
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule canon: pg_cron Supabase (NO Vercel Hobby blocker — memoria 25).
// Procesa hasta BATCH jobs en status='extracting' por invocación. Sentry per-job.

import { NextResponse } from 'next/server';
import { processJob } from '@/features/document-intel/lib/extraction-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_document_intel_extract';
const COUNTRY_CODE = 'MX';
const BATCH_SIZE = 5;

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get('authorization') === `Bearer ${expected}`;
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
      meta: { cron: 'document-jobs-process', batch_size: BATCH_SIZE },
    })
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'document-jobs-process', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;
  let jobsProcessed = 0;
  let jobsSucceeded = 0;
  let jobsFailed = 0;

  try {
    const { data: pending, error: queryErr } = await supabase
      .from('document_jobs')
      .select('id')
      .eq('status', 'extracting')
      .order('updated_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (queryErr) throw queryErr;

    for (const row of pending ?? []) {
      jobsProcessed += 1;
      try {
        const outcome = await processJob(row.id);
        if (outcome.status === 'extracted') jobsSucceeded += 1;
        else jobsFailed += 1;
      } catch (err) {
        jobsFailed += 1;
        sentry.captureException(err, {
          tags: { cron: 'document-jobs-process', stage: 'process_job', job_id: row.id },
        });
      }
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, { tags: { cron: 'document-jobs-process', stage: 'main_loop' } });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        completed_at: completedAt,
        duration_ms: durationMs,
        rows_inserted: jobsSucceeded,
        rows_skipped: jobsFailed,
        error: resultError,
        meta: {
          cron: 'document-jobs-process',
          jobs_processed: jobsProcessed,
          jobs_succeeded: jobsSucceeded,
          jobs_failed: jobsFailed,
        },
      })
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
    jobs_processed: jobsProcessed,
    jobs_succeeded: jobsSucceeded,
    jobs_failed: jobsFailed,
  });
}
