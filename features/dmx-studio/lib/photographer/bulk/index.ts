// F14.F.10 Sprint 9 BIBLIA — Bulk processing pipeline (2-20 propiedades).
// SUB-AGENT 3 scope: createBulkBatch genera batchId UUID, valida count [2,20],
// inserta studio_api_jobs por proyecto compartiendo metadata batch (job_type
// 'photographer_bulk' canon Sprint 9). Photographer scoping via studio_photographers.
//
// STUB ADR-018 — Compose pipeline real spawned by L-NEW-PHOTOGRAPHER-BULK-PIPELINE-WORKER:
// H1 deja jobs en status='queued' sin disparar features/dmx-studio/lib/pipeline real
// (regla zero gasto sin validación previa, founder OK pendiente). Worker async cron
// procesa queue + respeta rate limit per fotógrafo.

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { Database, Json } from '@/shared/types/database';

const MIN_BATCH_SIZE = 2;
const MAX_BATCH_SIZE = 20;

type StudioAdminClient = SupabaseClient<Database>;

export interface CreateBulkBatchInput {
  readonly photographerUserId: string;
  readonly projectIds: ReadonlyArray<string>;
}

export interface BulkBatchJobRow {
  readonly id: string;
  readonly project_id: string | null;
  readonly status: string;
}

export interface CreateBulkBatchResult {
  readonly batchId: string;
  readonly photographerId: string;
  readonly jobs: ReadonlyArray<BulkBatchJobRow>;
}

function generateBatchId(): string {
  return crypto.randomUUID();
}

async function resolvePhotographerId(supabase: StudioAdminClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('studio_photographers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'photographer_profile_not_found' });
  }
  return data.id;
}

export async function createBulkBatch(
  supabase: StudioAdminClient,
  input: CreateBulkBatchInput,
): Promise<CreateBulkBatchResult> {
  const { photographerUserId, projectIds } = input;

  if (projectIds.length < MIN_BATCH_SIZE || projectIds.length > MAX_BATCH_SIZE) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `bulk_batch_size_out_of_range_${MIN_BATCH_SIZE}_${MAX_BATCH_SIZE}`,
    });
  }

  const photographerId = await resolvePhotographerId(supabase, photographerUserId);

  const batchId = generateBatchId();
  const inserts = projectIds.map((projectId) => ({
    user_id: photographerUserId,
    project_id: projectId,
    job_type: 'photographer_bulk',
    provider: 'kling',
    status: 'queued',
    input_payload: { batchId, photographerId, projectId } as unknown as Json,
  }));

  const { data, error } = await supabase
    .from('studio_api_jobs')
    .insert(inserts)
    .select('id, project_id, status');

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  return {
    batchId,
    photographerId,
    jobs: (data ?? []) as ReadonlyArray<BulkBatchJobRow>,
  };
}

export const BULK_BATCH_LIMITS = {
  MIN: MIN_BATCH_SIZE,
  MAX: MAX_BATCH_SIZE,
} as const;
