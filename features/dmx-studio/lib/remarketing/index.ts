// F14.F.5 Sprint 4 Tarea 4.3 — DMX Studio remarketing automatico scan engine.
// Recorre studio_video_projects con success terminal status (rendered|published) y
// rendered_at > 14d sin remarketing reciente, escoge angle siguiente via rotator y
// crea studio_remarketing_jobs row + dispara video-pipeline async (kickoff F14.F.2).
//
// Naming nota: BIBLIA v4 menciona status='completed' pero canon studio_video_projects
// usa 'rendered' (post-render) y 'published' (post-publish) — ambos terminales. Por eso
// el scan filtra por ambos. Cooldown per-project default 7 dias (memoria 1 remark/sem).
// Active subscription gating: solo users con studio_subscription status active|trialing.
//
// kickoffVideoPipeline import is read-only (lib/pipeline owned por F14.F.2 sub-agent 5).

import { kickoffVideoPipeline } from '@/features/dmx-studio/lib/pipeline';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';
import { nextAngle } from './angle-rotator';
import {
  type RemarketingAngle,
  type ScanRemarketingOptions,
  ScanRemarketingOptionsSchema,
  type ScanRemarketingResult,
} from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface ScanDeps {
  readonly client?: AdminClient;
  readonly nowMs?: number;
  readonly triggerPipeline?: (input: { projectId: string; userId: string }) => Promise<unknown>;
}

const DEFAULT_OPTIONS: ScanRemarketingOptions = ScanRemarketingOptionsSchema.parse({});

const TERMINAL_SUCCESS_STATUSES = ['rendered', 'published'] as const;

interface CandidateRow {
  readonly projectId: string;
  readonly userId: string;
  readonly title: string | null;
}

async function fetchActiveStudioUserIds(supabase: AdminClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('studio_subscriptions')
    .select('user_id, status')
    .in('status', ['active', 'trialing']);
  if (error) {
    throw new Error(`scan.fetchActiveUsers failed: ${error.message}`);
  }
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.user_id) ids.add(row.user_id);
  }
  return ids;
}

async function fetchCandidateProjects(
  supabase: AdminClient,
  staleBeforeIso: string,
  activeUserIds: ReadonlySet<string>,
): Promise<ReadonlyArray<CandidateRow>> {
  if (activeUserIds.size === 0) return [];
  const { data, error } = await supabase
    .from('studio_video_projects')
    .select('id, user_id, title, status, rendered_at')
    .in('status', TERMINAL_SUCCESS_STATUSES as unknown as string[])
    .lt('rendered_at', staleBeforeIso)
    .in('user_id', Array.from(activeUserIds))
    .order('rendered_at', { ascending: true });
  if (error) {
    throw new Error(`scan.fetchCandidates failed: ${error.message}`);
  }
  return (data ?? [])
    .filter((row) => row.user_id && row.id)
    .map((row) => ({
      projectId: row.id,
      userId: row.user_id,
      title: row.title ?? null,
    }));
}

async function fetchRecentJobsBySource(
  supabase: AdminClient,
  cooldownAfterIso: string,
): Promise<Map<string, { angle: RemarketingAngle; createdAt: string }>> {
  // Returns map source_project_id -> latest job within cooldown window.
  const { data, error } = await supabase
    .from('studio_remarketing_jobs')
    .select('source_project_id, angle, created_at')
    .gte('created_at', cooldownAfterIso)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(`scan.fetchRecentJobs failed: ${error.message}`);
  }
  const map = new Map<string, { angle: RemarketingAngle; createdAt: string }>();
  for (const row of data ?? []) {
    if (!row.source_project_id) continue;
    if (map.has(row.source_project_id)) continue;
    map.set(row.source_project_id, {
      angle: row.angle as RemarketingAngle,
      createdAt: row.created_at,
    });
  }
  return map;
}

async function fetchHistoryAnglesForProject(
  supabase: AdminClient,
  sourceProjectId: string,
): Promise<ReadonlyArray<string>> {
  const { data, error } = await supabase
    .from('studio_remarketing_jobs')
    .select('angle, created_at')
    .eq('source_project_id', sourceProjectId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    throw new Error(`scan.fetchHistory failed: ${error.message}`);
  }
  return (data ?? []).map((row) => row.angle);
}

async function insertRemarketingJob(
  supabase: AdminClient,
  args: { userId: string; sourceProjectId: string; angle: RemarketingAngle },
): Promise<string> {
  const { data, error } = await supabase
    .from('studio_remarketing_jobs')
    .insert({
      user_id: args.userId,
      source_project_id: args.sourceProjectId,
      angle: args.angle,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`scan.insertJob failed: ${error?.message ?? 'no_id_returned'}`);
  }
  return data.id;
}

export async function scanForRemarketingOpportunities(
  optsInput: Partial<ScanRemarketingOptions> = {},
  deps: ScanDeps = {},
): Promise<ScanRemarketingResult> {
  const opts = ScanRemarketingOptionsSchema.parse({ ...DEFAULT_OPTIONS, ...optsInput });
  const supabase = deps.client ?? createAdminClient();
  const nowMs = deps.nowMs ?? Date.now();
  const staleBeforeIso = new Date(nowMs - opts.staleAfterDays * 86_400_000).toISOString();
  const cooldownAfterIso = new Date(nowMs - opts.perProjectCooldownDays * 86_400_000).toISOString();

  const activeUserIds = await fetchActiveStudioUserIds(supabase);
  const candidates = await fetchCandidateProjects(supabase, staleBeforeIso, activeUserIds);
  const recentJobs = await fetchRecentJobsBySource(supabase, cooldownAfterIso);

  const errors: Array<{ projectId: string; reason: string }> = [];
  let jobsCreated = 0;

  // Cap output to maxJobsPerRun to bound cost / DB load.
  const eligible = candidates.filter((c) => !recentJobs.has(c.projectId));
  const capped = eligible.slice(0, opts.maxJobsPerRun);

  for (const candidate of capped) {
    try {
      const history = await fetchHistoryAnglesForProject(supabase, candidate.projectId);
      const angle = nextAngle(history);
      const jobId = await insertRemarketingJob(supabase, {
        userId: candidate.userId,
        sourceProjectId: candidate.projectId,
        angle,
      });
      jobsCreated += 1;

      if (opts.triggerPipeline) {
        const trigger =
          deps.triggerPipeline ??
          ((input: { projectId: string; userId: string }) => kickoffVideoPipeline(input));
        // Fire-and-forget kickoff. Errors on pipeline kickoff are captured but do not
        // mark the job failed here — the pipeline writes its own status to
        // studio_video_projects + the row stays 'pending' until generator updates it.
        Promise.resolve()
          .then(() => trigger({ projectId: candidate.projectId, userId: candidate.userId }))
          .catch((err) => {
            sentry.captureException(err, {
              tags: { feature: 'dmx-studio.remarketing', op: 'kickoff_async' },
              extra: { jobId, sourceProjectId: candidate.projectId, angle },
            });
          });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown_error';
      errors.push({ projectId: candidate.projectId, reason });
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.remarketing', op: 'scan_candidate' },
        extra: { projectId: candidate.projectId },
      });
    }
  }

  return {
    scannedCount: candidates.length,
    jobsCreated,
    errors,
  };
}

export async function forceTriggerRemarketingJob(
  args: {
    userId: string;
    sourceProjectId: string;
    angle?: RemarketingAngle;
  },
  deps: ScanDeps = {},
): Promise<{ jobId: string; angle: RemarketingAngle }> {
  const supabase = deps.client ?? createAdminClient();
  let angle: RemarketingAngle;
  if (args.angle) {
    angle = args.angle;
  } else {
    const history = await fetchHistoryAnglesForProject(supabase, args.sourceProjectId);
    angle = nextAngle(history);
  }
  const jobId = await insertRemarketingJob(supabase, {
    userId: args.userId,
    sourceProjectId: args.sourceProjectId,
    angle,
  });
  const trigger =
    deps.triggerPipeline ??
    ((input: { projectId: string; userId: string }) => kickoffVideoPipeline(input));
  Promise.resolve()
    .then(() => trigger({ projectId: args.sourceProjectId, userId: args.userId }))
    .catch((err) => {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.remarketing', op: 'force_trigger_async' },
        extra: { jobId, sourceProjectId: args.sourceProjectId, angle },
      });
    });
  return { jobId, angle };
}

// Re-export pure helpers for tests + routes.
export { nextAngle } from './angle-rotator';
export type {
  ForceTriggerInput,
  RemarketingAngle,
  RemarketingJobIdInput,
  RemarketingJobStatus,
  ScanRemarketingOptions,
  ScanRemarketingResult,
} from './types';
export {
  ForceTriggerInputSchema,
  REMARKETING_ANGLES,
  REMARKETING_JOB_STATUSES,
  RemarketingAngleSchema,
  RemarketingJobIdInputSchema,
  RemarketingJobStatusSchema,
  ScanRemarketingOptionsSchema,
} from './types';

// Suppress unused Json type — kept for future telemetry payloads.
export type _JsonExportedForTelemetry = Json;
