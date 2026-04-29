// Cron biz · drive-monitor-poll
// FASE 17 sesión 17.A.UI — Drive Monitor poll real handler.
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3.
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: pg_cron Supabase (every 15 min). Vercel Hobby plan no soporta sub-daily.
//
// Loop:
//   - Toma monitors activos con next_poll_at vencido.
//   - Llama Drive API GET files in folder.
//   - Upsert drive_files_snapshot (UNIQUE monitor_id+drive_file_id).
//   - Update last_polled_at, last_polled_files_count, next_poll_at +15min.
//   - On error: incrementa failure_count + last_failure_message.
// Memoria 18: ingest_runs INSERT obligatorio + Bearer auth + Sentry.

import { NextResponse } from 'next/server';
import { pollFolder } from '@/features/document-intel/lib/drive-monitor';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 300;

const SOURCE = 'biz_drive_monitor_poll';
const COUNTRY_CODE = 'MX';
const POLL_INTERVAL_MIN = 15;
const MAX_MONITORS_PER_RUN = 50;

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
      meta: { cron: 'drive-monitor-poll' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'drive-monitor-poll', stage: 'observability_insert' },
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
  let filesAdded = 0;

  try {
    const nowIso = new Date().toISOString();
    const { data: monitors } = await supabase
      .from('drive_monitors')
      .select('id, drive_folder_id, desarrolladora_id, monitor_type, failure_count')
      .eq('is_active', true)
      .or(`next_poll_at.is.null,next_poll_at.lte.${nowIso}`)
      .order('next_poll_at', { ascending: true, nullsFirst: true })
      .limit(MAX_MONITORS_PER_RUN);

    for (const m of monitors ?? []) {
      try {
        const files = await pollFolder(m.drive_folder_id);
        for (const f of files) {
          const sizeBytes = f.size ? Number(f.size) : null;
          const { error: upsertErr } = await supabase.from('drive_files_snapshot').upsert(
            {
              monitor_id: m.id,
              drive_file_id: f.id,
              file_name: f.name,
              mime_type: f.mimeType,
              modified_time: f.modifiedTime,
              size_bytes: sizeBytes,
              last_seen_at: new Date().toISOString(),
            } as never,
            { onConflict: 'monitor_id,drive_file_id' },
          );
          if (!upsertErr) filesAdded += 1;
        }

        const nextPollAt = new Date(Date.now() + POLL_INTERVAL_MIN * 60 * 1000).toISOString();
        await supabase
          .from('drive_monitors')
          .update({
            last_polled_at: new Date().toISOString(),
            last_polled_files_count: files.length,
            next_poll_at: nextPollAt,
            failure_count: 0,
            last_failure_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', m.id);

        monitorsProcessed += 1;
      } catch (err) {
        sentry.captureException(err, {
          tags: { cron: 'drive-monitor-poll', monitor_id: m.id },
        });
        const failureMsg = err instanceof Error ? err.message.slice(0, 500) : 'unknown';
        await supabase
          .from('drive_monitors')
          .update({
            failure_count: (m.failure_count ?? 0) + 1,
            last_failure_message: failureMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', m.id);
      }
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'drive-monitor-poll', stage: 'main_loop' },
    });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        completed_at: completedAt,
        duration_ms: durationMs,
        rows_inserted: filesAdded,
        rows_updated: monitorsProcessed,
        error: resultError,
        meta: {
          cron: 'drive-monitor-poll',
          monitors_processed: monitorsProcessed,
          files_added: filesAdded,
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
    run_id: runId,
    monitors_processed: monitorsProcessed,
    files_added: filesAdded,
  });
}
