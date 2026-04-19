import { createAdminClient } from '@/shared/lib/supabase/admin';

// Dead-letter queue helper. Quality gates fallidos → push payload aquí.
// Admin revisa y resuelve manualmente desde /admin/ingest/dashboard.

export interface DlqEntry {
  runId: string;
  source: string;
  reason: string;
  payload: unknown;
}

export async function pushDlq(entry: DlqEntry): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('ingest_dlq').insert({
    run_id: entry.runId,
    source: entry.source,
    reason: entry.reason,
    payload: entry.payload as never,
  });
}

export async function pushDlqBatch(entries: DlqEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const supabase = createAdminClient();
  await supabase.from('ingest_dlq').insert(
    entries.map((e) => ({
      run_id: e.runId,
      source: e.source,
      reason: e.reason,
      payload: e.payload as never,
    })),
  );
}
