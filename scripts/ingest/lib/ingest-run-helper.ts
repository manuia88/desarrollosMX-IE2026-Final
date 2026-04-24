/**
 * Ingest run helper — wrapper reusable para ingest_runs / ingest_watermarks.
 *
 * Factored del patrón en scripts/ingest/00_seed-zones-canonical.ts para que los
 * scripts foundational (01-03) y futuros compartan la misma semántica:
 *   INSERT ingest_runs(running) → ejecutar fn → UPDATE status/counts → UPSERT watermark.
 *
 * No depende de shared/lib/ingest/orchestrator.ts — los scripts CLI corren fuera
 * del runtime Vercel y necesitan autonomía total.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../../shared/types/database.ts';

type IngestRunInsert = Database['public']['Tables']['ingest_runs']['Insert'];
type IngestRunUpdate = Database['public']['Tables']['ingest_runs']['Update'];
type IngestWatermarkInsert = Database['public']['Tables']['ingest_watermarks']['Insert'];

export type IngestStatus = 'running' | 'success' | 'failed' | 'partial' | 'budget_exceeded' | 'dlq';
export type IngestPeriodicity =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'on_demand';

export type IngestRunCounts = {
  inserted: number;
  updated: number;
  skipped: number;
  dlq?: number;
};

export type CreateIngestRunOptions = {
  source: string;
  countryCode: string;
  triggeredBy: string;
  meta?: Json;
};

export type FinalizeIngestRunOptions = {
  runId: string;
  status: IngestStatus;
  counts: IngestRunCounts;
  error?: string | null;
  startedAtMs: number;
};

export type UpsertWatermarkOptions = {
  source: string;
  countryCode: string;
  runId: string;
  lastSuccessfulPeriodEnd?: string | null;
  expectedPeriodicity?: IngestPeriodicity | null;
  meta?: Json;
};

export type WithIngestRunOptions = {
  source: string;
  countryCode: string;
  triggeredBy: string;
  meta?: Json;
  expectedPeriodicity?: IngestPeriodicity | null;
  upsertWatermarkOnSuccess?: boolean;
};

export type WithIngestRunResult = {
  runId: string;
  status: IngestStatus;
  counts: IngestRunCounts;
  error: string | null;
  durationMs: number;
  lastSuccessfulPeriodEnd: string | null;
};

type FnContext = {
  runId: string;
};

export type WithIngestRunFn = (
  ctx: FnContext,
) => Promise<{ counts: IngestRunCounts; lastSuccessfulPeriodEnd?: string | null }>;

function logTag(source: string): string {
  return `[ingest:${source}]`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeMeta(a: Json | undefined, b: Json | undefined): Json {
  if (isRecord(a) && isRecord(b)) {
    return { ...a, ...b } as Json;
  }
  if (isRecord(b)) return b;
  if (isRecord(a)) return a;
  return {};
}

export async function createIngestRun(
  supabase: SupabaseClient<Database>,
  opts: CreateIngestRunOptions,
): Promise<string> {
  const tag = logTag(opts.source);
  const insert: IngestRunInsert = {
    source: opts.source,
    country_code: opts.countryCode,
    status: 'running',
    triggered_by: opts.triggeredBy,
    meta: opts.meta ?? {},
  };
  const { data, error } = await supabase.from('ingest_runs').insert(insert).select('id').single();
  if (error || data == null) {
    throw new Error(`${tag} no se pudo crear ingest_runs row: ${error?.message ?? 'unknown'}`);
  }
  console.log(`${tag} ingest_run id=${data.id}`);
  return data.id;
}

export async function finalizeIngestRun(
  supabase: SupabaseClient<Database>,
  opts: FinalizeIngestRunOptions,
): Promise<void> {
  const tag = logTag('finalize');
  const durationMs = Date.now() - opts.startedAtMs;
  const update: IngestRunUpdate = {
    status: opts.status,
    rows_inserted: opts.counts.inserted,
    rows_updated: opts.counts.updated,
    rows_skipped: opts.counts.skipped,
    rows_dlq: opts.counts.dlq ?? 0,
    completed_at: new Date().toISOString(),
    duration_ms: durationMs,
    error: opts.error ?? null,
  };
  const { error } = await supabase.from('ingest_runs').update(update).eq('id', opts.runId);
  if (error) {
    console.error(
      `${tag} WARNING: no se pudo actualizar ingest_runs ${opts.runId}: ${error.message}`,
    );
  }
}

export async function upsertWatermark(
  supabase: SupabaseClient<Database>,
  opts: UpsertWatermarkOptions,
): Promise<void> {
  const tag = logTag(opts.source);
  const row: IngestWatermarkInsert = {
    source: opts.source,
    country_code: opts.countryCode,
    last_successful_run_id: opts.runId,
    last_successful_at: new Date().toISOString(),
    last_successful_period_end: opts.lastSuccessfulPeriodEnd ?? null,
    expected_periodicity: opts.expectedPeriodicity ?? null,
    meta: opts.meta ?? {},
  };
  const { error } = await supabase.from('ingest_watermarks').upsert(row, { onConflict: 'source' });
  if (error) {
    console.error(`${tag} WARNING: no se pudo upsert ingest_watermarks: ${error.message}`);
  }
}

export async function withIngestRun(
  supabase: SupabaseClient<Database>,
  opts: WithIngestRunOptions,
  fn: WithIngestRunFn,
): Promise<WithIngestRunResult> {
  const tag = logTag(opts.source);
  const startedAtMs = Date.now();
  const runId = await createIngestRun(supabase, {
    source: opts.source,
    countryCode: opts.countryCode,
    triggeredBy: opts.triggeredBy,
    meta: mergeMeta({ script_start_ts: new Date().toISOString() } as Json, opts.meta),
  });

  let status: IngestStatus = 'success';
  let errorMessage: string | null = null;
  let counts: IngestRunCounts = { inserted: 0, updated: 0, skipped: 0 };
  let lastSuccessfulPeriodEnd: string | null = null;

  try {
    const out = await fn({ runId });
    counts = out.counts;
    lastSuccessfulPeriodEnd = out.lastSuccessfulPeriodEnd ?? null;
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`${tag} FAILED: ${errorMessage}`);
  } finally {
    await finalizeIngestRun(supabase, {
      runId,
      status,
      counts,
      error: errorMessage,
      startedAtMs,
    });
  }

  if (status === 'success' && opts.upsertWatermarkOnSuccess !== false) {
    await upsertWatermark(supabase, {
      source: opts.source,
      countryCode: opts.countryCode,
      runId,
      lastSuccessfulPeriodEnd,
      expectedPeriodicity: opts.expectedPeriodicity ?? null,
      meta: { triggered_by: opts.triggeredBy } as Json,
    });
  }

  return {
    runId,
    status,
    counts,
    error: errorMessage,
    durationMs: Date.now() - startedAtMs,
    lastSuccessfulPeriodEnd,
  };
}
