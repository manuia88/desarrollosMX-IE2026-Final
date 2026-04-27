// FASE 14.F.2 Sprint 1 — Pipeline job tracker (status polling endpoint).

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface JobStatus {
  readonly id: string;
  readonly jobType: string;
  readonly provider: string;
  readonly status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly errorMessage: string | null;
}

export interface ProjectJobsStatus {
  readonly projectId: string;
  readonly stages: ReadonlyArray<{
    readonly stage: string;
    readonly jobs: readonly JobStatus[];
  }>;
}

export async function getProjectJobsStatus(args: {
  readonly projectId: string;
  readonly userId: string;
}): Promise<ProjectJobsStatus> {
  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from('studio_video_projects')
    .select('id')
    .eq('id', args.projectId)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (!project) {
    return { projectId: args.projectId, stages: [] };
  }

  const { data: jobs } = await supabase
    .from('studio_api_jobs')
    .select('id, job_type, provider, status, attempt_count, max_attempts, error_message')
    .eq('project_id', args.projectId)
    .order('created_at', { ascending: true });

  const grouped = new Map<string, JobStatus[]>();
  for (const job of jobs ?? []) {
    const list = grouped.get(job.job_type) ?? [];
    list.push({
      id: job.id,
      jobType: job.job_type,
      provider: job.provider,
      status: job.status as JobStatus['status'],
      attemptCount: job.attempt_count,
      maxAttempts: job.max_attempts,
      errorMessage: job.error_message,
    });
    grouped.set(job.job_type, list);
  }

  return {
    projectId: args.projectId,
    stages: Array.from(grouped.entries()).map(([stage, jobsOfStage]) => ({
      stage,
      jobs: jobsOfStage,
    })),
  };
}
