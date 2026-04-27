// F14.F.5 Sprint 4 Tarea 4.3 — DMX Studio remarketing automatico cron handler.
// Schedule canon Hobby plan: 0 6 * * * (daily 6am UTC, post-render-window minimo).
// Auth: Authorization: Bearer ${CRON_SECRET} (canon BATCH 4 PR #38).
// Observability: ingest_runs INSERT fail-fast (memoria cron_observability_obligatorio)
// con source='biz_studio_remarketing_scan' + try/finally + Sentry capture.

import { NextResponse } from 'next/server';
import { scanForRemarketingOpportunities } from '@/features/dmx-studio/lib/remarketing';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 60;

const SOURCE = 'biz_studio_remarketing_scan';
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
      meta: { cron: 'studio-remarketing-scan' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'studio-remarketing-scan', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let scannedCount = 0;
  let jobsCreated = 0;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;
  let errorsSummary: ReadonlyArray<{ projectId: string; reason: string }> = [];

  try {
    const result = await scanForRemarketingOpportunities();
    scannedCount = result.scannedCount;
    jobsCreated = result.jobsCreated;
    errorsSummary = result.errors;
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'studio-remarketing-scan', stage: 'scan' },
    });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        rows_inserted: jobsCreated,
        rows_skipped: Math.max(scannedCount - jobsCreated, 0),
        completed_at: completedAt,
        duration_ms: durationMs,
        error: resultError,
        meta: {
          cron: 'studio-remarketing-scan',
          scanned_count: scannedCount,
          jobs_created: jobsCreated,
          per_project_errors: errorsSummary.length,
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
    scannedCount,
    jobsCreated,
    runId,
  });
}
