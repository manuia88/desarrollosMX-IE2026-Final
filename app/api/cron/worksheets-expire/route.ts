// Cron biz · worksheets-expire-30min (B.1 FASE 15 ola 3 — handler real)
// Reference: ADR-060 + 03.7 cron canon append v3
//
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: vercel.json `*/30 * * * *` (cada 30 min).
// Observability: ingest_runs INSERT fail-fast (memoria cron_observability_obligatorio)
// con source='biz_worksheets_expire' y try/finally.
// Acción: UPDATE unit_worksheets SET status='expired' WHERE expires_at < now() AND status='pending'.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 60;

const SOURCE = 'biz_worksheets_expire';
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
      meta: { cron: 'worksheets-expire' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'worksheets-expire', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let rowsUpdated = 0;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('unit_worksheets')
      .update({ status: 'expired' } as never)
      .eq('status', 'pending')
      .lt('expires_at', nowIso)
      .select('id');
    if (error) {
      throw new Error(error.message);
    }
    rowsUpdated = data?.length ?? 0;
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'worksheets-expire', stage: 'mark_expired' },
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
      } as never)
      .eq('id', runId);
  }

  if (resultStatus === 'error') {
    return NextResponse.json(
      { ok: false, error: resultError ?? 'unknown_error', run_id: runId },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, count_updated: rowsUpdated, run_id: runId });
}
