// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Raw video upload + audio extract.
// Procedures: upload, getById, listByUser, listByProject.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  RAW_VIDEO_MAX_BYTES,
  RAW_VIDEO_MIME_TYPES,
  registerRawVideo,
  triggerAudioExtract,
} from '@/features/dmx-studio/lib/raw-video-uploader';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const uploadInput = z.object({
  sourceStoragePath: z.string().min(1).max(512),
  fileSizeBytes: z.number().int().min(0).max(RAW_VIDEO_MAX_BYTES),
  mimeType: z.enum(RAW_VIDEO_MIME_TYPES),
  projectId: z.string().uuid().optional(),
  durationSeconds: z.number().min(0).max(36000).optional(),
});

const idInput = z.object({ id: z.string().uuid() });
const listInput = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export const studioRawVideosRouter = router({
  upload: studioProcedure.input(uploadInput).mutation(async ({ input, ctx }) => {
    try {
      const result = await registerRawVideo({
        userId: ctx.user.id,
        sourceStoragePath: input.sourceStoragePath,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
      });
      void triggerAudioExtract(result.rawVideoId).catch((err: unknown) => {
        sentry.captureException(err, {
          tags: { module: 'dmx-studio', component: 'raw-videos', op: 'upload-trigger-extract' },
          extra: { rawVideoId: result.rawVideoId },
        });
      });
      return result;
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'raw-videos', op: 'upload' },
      });
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'upload failed',
      });
    }
  }),

  getById: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_raw_videos')
      .select('*')
      .eq('id', input.id)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  listByUser: studioProcedure.input(listInput.optional()).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('studio_raw_videos')
      .select(
        'id, project_id, mime_type, duration_seconds, transcription_status, cuts_applied, created_at',
      )
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(input?.limit ?? 50);
    if (input?.status) {
      query = query.eq('transcription_status', input.status);
    }
    const { data, error } = await query;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  listByProject: studioProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_raw_videos')
        .select('id, mime_type, duration_seconds, transcription_status, cuts_applied, created_at')
        .eq('user_id', ctx.user.id)
        .eq('project_id', input.projectId)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),
});
