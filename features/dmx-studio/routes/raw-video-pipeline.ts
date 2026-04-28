// F14.F.6 Sprint 5 BIBLIA Tarea 5.2 — Transcription pipeline.
// Procedures: triggerTranscription, getTranscription, retry.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { transcribeRawVideo } from '@/features/dmx-studio/lib/raw-video-pipeline/transcription-orchestrator';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const idInput = z.object({ rawVideoId: z.string().uuid() });

async function loadOwnedVideo(rawVideoId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, transcription_status, transcription, audio_extract_storage_path')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  if (data.user_id !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return data;
}

export const studioRawVideoPipelineRouter = router({
  triggerTranscription: studioProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    if (!video.audio_extract_storage_path) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'audio_extract_storage_path missing — wait for audio extract',
      });
    }
    try {
      return await transcribeRawVideo(input.rawVideoId);
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'raw-video-pipeline', op: 'transcribe' },
        extra: { rawVideoId: input.rawVideoId },
      });
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'transcription failed',
      });
    }
  }),

  getTranscription: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    return {
      status: video.transcription_status,
      transcription: video.transcription,
    };
  }),
});
