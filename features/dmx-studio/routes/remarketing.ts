// F14.F.5 Sprint 4 Tarea 4.3 — DMX Studio remarketing automatico tRPC procedures.
// getActiveJobs: lista jobs (pending|generating|completed) del user current.
// forceTrigger: insert job pending + kickoff video-pipeline (mismo motor que cron).
// cancel: marca status='failed' + error_message='cancelled_by_user'.
// getStatus: row completo. Errors via TRPCError + Sentry tag remarketing.

import { TRPCError } from '@trpc/server';
import {
  ForceTriggerInputSchema,
  forceTriggerRemarketingJob,
  RemarketingJobIdInputSchema,
} from '@/features/dmx-studio/lib/remarketing';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioRemarketingRouter = router({
  getActiveJobs: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_remarketing_jobs')
      .select(
        'id, source_project_id, new_project_id, angle, status, created_at, generated_at, error_message',
      )
      .eq('user_id', ctx.user.id)
      .in('status', ['pending', 'generating', 'completed'])
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      sourceProjectId: row.source_project_id,
      newProjectId: row.new_project_id ?? null,
      angle: row.angle,
      status: row.status,
      createdAt: row.created_at,
      generatedAt: row.generated_at ?? null,
      errorMessage: row.error_message ?? null,
    }));
  }),

  forceTrigger: studioProcedure.input(ForceTriggerInputSchema).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: project, error: projErr } = await supabase
      .from('studio_video_projects')
      .select('id, user_id, status')
      .eq('id', input.sourceProjectId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (projErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: projErr });
    }
    if (!project) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    if (project.status !== 'rendered' && project.status !== 'published') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'source_project_must_be_rendered_or_published',
      });
    }
    try {
      const result = await forceTriggerRemarketingJob({
        userId: ctx.user.id,
        sourceProjectId: input.sourceProjectId,
        ...(input.angle ? { angle: input.angle } : {}),
      });
      return { ok: true as const, jobId: result.jobId, angle: result.angle };
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.remarketing', op: 'forceTrigger' },
        extra: { sourceProjectId: input.sourceProjectId },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'force_trigger_failed',
      });
    }
  }),

  cancel: studioProcedure.input(RemarketingJobIdInputSchema).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: existing, error: lookupErr } = await supabase
      .from('studio_remarketing_jobs')
      .select('id, status')
      .eq('id', input.jobId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (lookupErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: lookupErr });
    }
    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    if (existing.status === 'completed' || existing.status === 'failed') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'job_already_terminal',
      });
    }
    const { error: updErr } = await supabase
      .from('studio_remarketing_jobs')
      .update({
        status: 'failed',
        error_message: 'cancelled_by_user',
      })
      .eq('id', input.jobId)
      .eq('user_id', ctx.user.id);
    if (updErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updErr });
    }
    return { ok: true as const, jobId: input.jobId };
  }),

  getStatus: studioProcedure.input(RemarketingJobIdInputSchema).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_remarketing_jobs')
      .select('*')
      .eq('id', input.jobId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    }
    if (!data) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    return data;
  }),
});
