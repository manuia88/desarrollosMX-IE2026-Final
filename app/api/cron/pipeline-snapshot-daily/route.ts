import { NextResponse } from 'next/server';
import { snapshotAllProjectsForCron } from '@/shared/lib/moonshots/pipeline-tracker';
import { dispatchPendingAlerts } from '@/shared/lib/moonshots/radar-dispatch';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase = createAdminClient();

  let pipelineResult: Awaited<ReturnType<typeof snapshotAllProjectsForCron>> = {
    projectsProcessed: 0,
    errors: 0,
  };
  let dispatchResult: Awaited<ReturnType<typeof dispatchPendingAlerts>> = {
    alertsScanned: 0,
    notificationsSent: 0,
    errors: 0,
  };
  let runStatus: 'success' | 'partial_failure' = 'success';
  let runError: string | null = null;

  try {
    pipelineResult = await snapshotAllProjectsForCron(supabase);
    dispatchResult = await dispatchPendingAlerts(supabase);
    if (pipelineResult.errors > 0 || dispatchResult.errors > 0) {
      runStatus = 'partial_failure';
    }
  } catch (err) {
    runStatus = 'partial_failure';
    runError = err instanceof Error ? err.message : 'unknown';
  }

  await supabase.from('ingest_runs').insert({
    source: 'cron:pipeline-snapshot-daily',
    status: runStatus,
    country_code: 'MX',
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    rows_inserted: pipelineResult.projectsProcessed,
    error: runError,
    triggered_by: 'cron',
    meta: {
      pipeline: pipelineResult,
      dispatch: dispatchResult,
    },
  });

  return NextResponse.json({
    ok: true,
    pipeline: pipelineResult,
    dispatch: dispatchResult,
    durationMs: Date.now() - startedAt,
  });
}
