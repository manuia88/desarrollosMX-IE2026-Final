// FASE 14.F.2 Sprint 1 — Pipeline cost tracker (Tarea 1.5 BIBLIA).
// Inserta filas studio_api_jobs por cada llamada IA + studio_usage_logs aggregate por pipeline run.
// RLS bypass intencional via createAdminClient (server-side only). user_id explícito en cada insert.

import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

export type StudioJobType =
  | 'claude_director'
  | 'kling_render'
  | 'seedance_render'
  | 'elevenlabs_voice'
  | 'flux_image'
  | 'vision_classify'
  | 'heygen_avatar'
  | 'virtual_staging'
  | 'sandbox_ffmpeg'
  | 'deepgram_transcribe';

export type StudioJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export type StudioMetricType =
  | 'video_render'
  | 'copy_generation'
  | 'voice_synthesis'
  | 'voice_clone_train'
  | 'image_generation'
  | 'vision_classify'
  | 'virtual_staging'
  | 'avatar_render'
  | 'transcription'
  | 'sandbox_render';

export interface TrackJobInput {
  readonly projectId: string;
  readonly userId: string;
  readonly jobType: StudioJobType;
  readonly provider: string;
  readonly status?: StudioJobStatus;
  readonly estimatedCost: number;
  readonly externalJobId?: string;
  readonly inputPayload?: Json;
}

export interface TrackJobResult {
  readonly id: string;
}

type AdminClient = ReturnType<typeof createAdminClient>;

function getClient(client?: AdminClient): AdminClient {
  return client ?? createAdminClient();
}

export async function trackJob(
  input: TrackJobInput,
  opts?: { client?: AdminClient },
): Promise<TrackJobResult> {
  const supabase = getClient(opts?.client);
  const status: StudioJobStatus = input.status ?? 'running';
  const startedAt = status === 'running' ? new Date().toISOString() : null;
  const insertPayload = {
    project_id: input.projectId,
    user_id: input.userId,
    job_type: input.jobType,
    provider: input.provider,
    status,
    estimated_cost_usd: input.estimatedCost,
    external_job_id: input.externalJobId ?? null,
    input_payload: input.inputPayload ?? ({} as Json),
    started_at: startedAt,
  };
  const { data, error } = await supabase
    .from('studio_api_jobs')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`cost-tracker.trackJob failed: ${error?.message ?? 'no row returned'}`);
  }
  return { id: data.id };
}

export async function completeJob(
  jobId: string,
  outputPayload: Json,
  actualCost: number,
  opts?: { client?: AdminClient },
): Promise<void> {
  const supabase = getClient(opts?.client);
  const { error } = await supabase
    .from('studio_api_jobs')
    .update({
      status: 'completed',
      output_payload: outputPayload,
      actual_cost_usd: actualCost,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) {
    throw new Error(`cost-tracker.completeJob failed: ${error.message}`);
  }
}

export async function failJob(
  jobId: string,
  errorMessage: string,
  attemptCount: number,
  opts?: { client?: AdminClient },
): Promise<void> {
  const supabase = getClient(opts?.client);
  const { error } = await supabase
    .from('studio_api_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      attempt_count: attemptCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) {
    throw new Error(`cost-tracker.failJob failed: ${error.message}`);
  }
}

export interface LogPipelineUsageInput {
  readonly userId: string;
  readonly projectId: string;
  readonly metricType: StudioMetricType;
  readonly metricAmount: number;
  readonly costUsd: number;
  readonly apiJobId?: string;
}

function periodMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function logPipelineUsage(
  input: LogPipelineUsageInput,
  opts?: { client?: AdminClient },
): Promise<{ id: string }> {
  const supabase = getClient(opts?.client);
  const { data, error } = await supabase
    .from('studio_usage_logs')
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      api_job_id: input.apiJobId ?? null,
      metric_type: input.metricType,
      metric_amount: input.metricAmount,
      cost_usd: input.costUsd,
      period_month: periodMonth(),
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`cost-tracker.logPipelineUsage failed: ${error?.message ?? 'no row returned'}`);
  }
  return { id: data.id };
}
