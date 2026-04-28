// F14.F.10 Sprint 9 BIBLIA — Bulk queue manager.
// Aggregation helper para getBatchStatus + cancelBatch + rate limiting (max 10
// concurrent jobs per fotógrafo evitando overload Replicate/ElevenLabs).
//
// STUB ADR-018 — Worker scheduler real defer L-NEW-PHOTOGRAPHER-BULK-PIPELINE-WORKER:
// applyRateLimit aquí solo PRECONDITION_FAILED si current concurrent > MAX. Cron
// que mueve queue → processing aún no shippeado (regla zero gasto previa H1).

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { Database, Json } from '@/shared/types/database';

type StudioAdminClient = SupabaseClient<Database>;

export const MAX_CONCURRENT_JOBS_PER_PHOTOGRAPHER = 10;

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled']);
const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['queued', 'running', 'processing']);

export interface BatchJobSummary {
  readonly id: string;
  readonly project_id: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly completed_at: string | null;
  readonly input_payload: Json;
}

export interface BatchStatusResult {
  readonly batchId: string;
  readonly jobs: ReadonlyArray<BatchJobSummary>;
  readonly counts: Readonly<Record<string, number>>;
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly inProgress: number;
  readonly progressPct: number;
  readonly allCompleted: boolean;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function payloadBatchId(payload: Json | null): string | null {
  if (!isPlainRecord(payload)) return null;
  const value = payload.batchId;
  return typeof value === 'string' ? value : null;
}

export async function getQueueStatus(
  supabase: StudioAdminClient,
  photographerUserId: string,
  batchId: string,
): Promise<BatchStatusResult> {
  const { data, error } = await supabase
    .from('studio_api_jobs')
    .select('id, project_id, status, created_at, completed_at, input_payload')
    .eq('user_id', photographerUserId)
    .eq('job_type', 'photographer_bulk')
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  const jobs: ReadonlyArray<BatchJobSummary> = (data ?? []).filter(
    (row): row is BatchJobSummary => payloadBatchId(row.input_payload) === batchId,
  );

  const counts: Record<string, number> = {};
  for (const job of jobs) {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
  }

  const total = jobs.length;
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;
  const inProgress = jobs.filter((j) => ACTIVE_STATUSES.has(j.status)).length;
  const terminal = jobs.filter((j) => TERMINAL_STATUSES.has(j.status)).length;
  const progressPct = total === 0 ? 0 : Math.round((terminal / total) * 100);
  const allCompleted = total > 0 && terminal === total;

  return {
    batchId,
    jobs,
    counts,
    total,
    completed,
    failed,
    inProgress,
    progressPct,
    allCompleted,
  };
}

export interface CancelBatchResult {
  readonly batchId: string;
  readonly cancelledCount: number;
}

export async function cancelBatch(
  supabase: StudioAdminClient,
  photographerUserId: string,
  batchId: string,
): Promise<CancelBatchResult> {
  const status = await getQueueStatus(supabase, photographerUserId, batchId);
  const cancellable = status.jobs.filter(
    (j) => !TERMINAL_STATUSES.has(j.status) && j.status !== 'cancelled',
  );
  if (cancellable.length === 0) {
    return { batchId, cancelledCount: 0 };
  }

  const ids = cancellable.map((j) => j.id);
  const { error } = await supabase
    .from('studio_api_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .eq('user_id', photographerUserId);

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  return { batchId, cancelledCount: ids.length };
}

export interface RateLimitCheck {
  readonly allowed: boolean;
  readonly currentConcurrent: number;
  readonly limit: number;
}

export async function checkRateLimit(
  supabase: StudioAdminClient,
  photographerUserId: string,
): Promise<RateLimitCheck> {
  const { data, error } = await supabase
    .from('studio_api_jobs')
    .select('id, status', { count: 'exact', head: false })
    .eq('user_id', photographerUserId)
    .eq('job_type', 'photographer_bulk')
    .in('status', ['queued', 'running', 'processing']);

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  const currentConcurrent = (data ?? []).length;
  return {
    allowed: currentConcurrent < MAX_CONCURRENT_JOBS_PER_PHOTOGRAPHER,
    currentConcurrent,
    limit: MAX_CONCURRENT_JOBS_PER_PHOTOGRAPHER,
  };
}
