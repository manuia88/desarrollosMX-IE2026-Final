// F14.F.7 Sprint 6 BIBLIA v4 §6 — tRPC router para Seedance + Virtual Staging + Drone + Cinema Mode.
// Agency-plan-only canon (studio_subscriptions plan_key='agency').

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  AGENCY_PLAN_KEY,
  FEATURE_FLAGS,
  isAgencyPlan,
} from '@/features/dmx-studio/lib/feature-flags';
import {
  GenerateSeedanceClipInputSchema,
  generateVideoWithAudio,
} from '@/features/dmx-studio/lib/fal-gateway/seedance';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioAgencyProcedure } from './_agency-procedure';
import { studioProcedure } from './_studio-procedure';

const seedanceGenerateInput = GenerateSeedanceClipInputSchema.extend({
  projectId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
});

const seedanceListInput = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['pending', 'submitted', 'processing', 'completed', 'failed']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const stagingGenerateInput = z.object({
  projectId: z.string().uuid(),
  sourceAssetId: z.string().uuid(),
  imageUrl: z.string().url(),
  style: z.enum(['modern', 'classic', 'minimalist', 'industrial', 'bohemian', 'luxury', 'family']),
  roomType: z
    .enum(['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'office', 'outdoor', 'garage', 'other'])
    .optional(),
});

const stagingBatchInput = z.object({
  projectId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).min(1).max(20),
  style: z.enum(['modern', 'classic', 'minimalist', 'industrial', 'bohemian', 'luxury', 'family']),
});

const droneSimulateInput = z.object({
  projectId: z.string().uuid(),
  imageUrl: z.string().url(),
  flightPattern: z.enum(['orbital', 'flyover', 'approach', 'reveal']),
  durationSeconds: z.number().int().min(3).max(15).default(7),
});

const cinemaModeEnableInput = z.object({
  projectId: z.string().uuid(),
});

export const studioSprint6SeedanceRouter = router({
  generateClip: studioAgencyProcedure
    .input(seedanceGenerateInput)
    .mutation(async ({ input, ctx }) => {
      if (!FEATURE_FLAGS.SEEDANCE_ENABLED) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Seedance feature disabled' });
      }
      const supabase = createAdminClient();
      const { data: row, error: insertError } = await supabase
        .from('studio_seedance_clips')
        .insert({
          project_id: input.projectId,
          user_id: ctx.user.id,
          asset_id: input.assetId ?? null,
          prompt: input.prompt,
          audio_context: input.audioContext ?? 'auto',
          duration_seconds: input.durationSeconds ?? 5,
          resolution: input.resolution ?? '1080p',
          status: 'submitted',
        })
        .select('id')
        .single();
      if (insertError || !row) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertError ?? undefined });
      }
      try {
        const result = await generateVideoWithAudio(input);
        await supabase
          .from('studio_seedance_clips')
          .update({
            status: 'completed',
            storage_path: result.videoUrl,
            cost_usd: result.costUsd,
            fal_request_id: result.requestId,
            completed_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        return { clipId: row.id, ...result };
      } catch (err) {
        sentry.captureException(err, {
          tags: { module: 'dmx-studio', component: 'sprint6.seedance', op: 'generateClip' },
        });
        await supabase
          .from('studio_seedance_clips')
          .update({ status: 'failed' })
          .eq('id', row.id);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'seedance failed',
        });
      }
    }),

  listClips: studioProcedure.input(seedanceListInput).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('studio_seedance_clips')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (input.projectId) query = query.eq('project_id', input.projectId);
    if (input.status) query = query.eq('status', input.status);
    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  getAmbientLibrary: studioProcedure.query(async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_audio_ambient_library')
      .select('*')
      .eq('is_active', true)
      .order('slug');
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),
});

export const studioSprint6VirtualStagingRouter = router({
  stageAsset: studioAgencyProcedure
    .input(stagingGenerateInput)
    .mutation(async ({ input, ctx }) => {
      if (!FEATURE_FLAGS.VIRTUAL_STAGING_ENABLED) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Virtual Staging feature disabled',
        });
      }
      const { stageRoom } = await import('@/features/dmx-studio/lib/virtual-staging');
      const supabase = createAdminClient();
      const { data: row, error: insertError } = await supabase
        .from('studio_virtual_staging_jobs')
        .insert({
          project_id: input.projectId,
          user_id: ctx.user.id,
          source_asset_id: input.sourceAssetId,
          staging_style: input.style,
          room_type: input.roomType ?? 'living',
          status: 'processing',
          is_stub: false,
        })
        .select('id')
        .single();
      if (insertError || !row) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertError ?? undefined });
      }
      try {
        const result = await stageRoom({
          imageUrl: input.imageUrl,
          style: input.style,
          roomType: input.roomType ?? 'living',
        });
        await supabase
          .from('studio_virtual_staging_jobs')
          .update({
            status: 'completed',
            output_url: result.stagedImageUrl,
            cost_usd: result.costUsd,
            meta: { pedra_job_id: result.pedraJobId },
          })
          .eq('id', row.id);
        return { jobId: row.id, ...result };
      } catch (err) {
        sentry.captureException(err, {
          tags: { module: 'dmx-studio', component: 'sprint6.virtual-staging', op: 'stageAsset' },
        });
        await supabase
          .from('studio_virtual_staging_jobs')
          .update({ status: 'failed' })
          .eq('id', row.id);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'staging failed',
        });
      }
    }),

  batchStage: studioAgencyProcedure
    .input(stagingBatchInput)
    .mutation(async ({ input, ctx }) => {
      if (!FEATURE_FLAGS.VIRTUAL_STAGING_ENABLED) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Virtual Staging feature disabled',
        });
      }
      const supabase = createAdminClient();
      const { data: assets, error: loadErr } = await supabase
        .from('studio_video_assets')
        .select('id, storage_url')
        .in('id', input.assetIds);
      if (loadErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: loadErr });
      if (!assets || assets.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });

      const batchId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `batch_${Date.now()}`;

      const inserts = assets.map((a) => ({
        project_id: input.projectId,
        user_id: ctx.user.id,
        source_asset_id: a.id,
        staging_style: input.style,
        room_type: 'living',
        status: 'pending',
        batch_id: batchId,
        is_batch_member: true,
        is_stub: false,
      }));
      const { error: bulkErr } = await supabase
        .from('studio_virtual_staging_jobs')
        .insert(inserts);
      if (bulkErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: bulkErr });

      return { batchId, jobsCount: assets.length };
    }),

  listJobs: studioProcedure
    .input(z.object({ projectId: z.string().uuid().optional(), batchId: z.string().uuid().optional() }))
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('studio_virtual_staging_jobs')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (input.projectId) query = query.eq('project_id', input.projectId);
      if (input.batchId) query = query.eq('batch_id', input.batchId);
      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),
});

export const studioSprint6DroneRouter = router({
  simulate: studioAgencyProcedure.input(droneSimulateInput).mutation(async ({ input, ctx }) => {
    if (!FEATURE_FLAGS.DRONE_SIM_ENABLED) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Drone sim feature disabled' });
    }
    const supabase = createAdminClient();
    const { data: row, error: insertError } = await supabase
      .from('studio_drone_simulations')
      .insert({
        project_id: input.projectId,
        user_id: ctx.user.id,
        simulation_type: input.flightPattern,
        duration_seconds: input.durationSeconds,
        status: 'pending',
        is_stub: false,
      })
      .select('id')
      .single();
    if (insertError || !row) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertError ?? undefined });
    }
    return { simulationId: row.id, status: 'pending' as const };
  }),

  listSimulations: studioProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }))
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('studio_drone_simulations')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (input.projectId) query = query.eq('project_id', input.projectId);
      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),
});

export const studioSprint6CinemaModeRouter = router({
  enable: studioAgencyProcedure.input(cinemaModeEnableInput).mutation(async ({ input, ctx }) => {
    if (!FEATURE_FLAGS.CINEMA_MODE_ENABLED) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Cinema Mode feature disabled' });
    }
    const supabase = createAdminClient();
    const { data: project, error: loadErr } = await supabase
      .from('studio_video_projects')
      .select('id, user_id, meta')
      .eq('id', input.projectId)
      .maybeSingle();
    if (loadErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: loadErr });
    if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
    if (project.user_id !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

    const meta = (project.meta as Record<string, unknown>) ?? {};
    meta.cinema_mode = true;
    meta.cinema_mode_features = ['drone', 'seedance_ambient', 'branded_overlay', 'multi_format', 'beat_sync'];

    const { error: updateErr } = await supabase
      .from('studio_video_projects')
      .update({ meta: meta as never })
      .eq('id', input.projectId);
    if (updateErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updateErr });
    return { ok: true, features: meta.cinema_mode_features };
  }),
});

export const studioSprint6TogglesRouter = router({
  getAvailability: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_subscriptions')
      .select('plan_key, status')
      .eq('user_id', ctx.user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    const planKey = data?.plan_key ?? null;
    const isAgency = isAgencyPlan(planKey);
    return {
      planKey,
      isAgency,
      flags: {
        seedance: FEATURE_FLAGS.SEEDANCE_ENABLED && isAgency,
        virtualStaging: FEATURE_FLAGS.VIRTUAL_STAGING_ENABLED && isAgency,
        droneSim: FEATURE_FLAGS.DRONE_SIM_ENABLED && isAgency,
        cinemaMode: FEATURE_FLAGS.CINEMA_MODE_ENABLED && isAgency,
      },
      requiredPlan: AGENCY_PLAN_KEY,
    };
  }),
});
