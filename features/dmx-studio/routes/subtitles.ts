// F14.F.6 Sprint 5 BIBLIA Tarea 5.5 — Subtitles + 5 styles canon.
// Procedures: getStyles, applyStyle, downloadSrt.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { applySubtitlesToVideo } from '@/features/dmx-studio/lib/subtitles/ffmpeg-overlay';
import { generateSrt } from '@/features/dmx-studio/lib/subtitles/srt-generator';
import {
  SUBTITLE_STYLES,
  type SubtitleStyleKey,
} from '@/features/dmx-studio/lib/subtitles/styles-canon';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const idInput = z.object({ rawVideoId: z.string().uuid() });
const STYLE_KEYS = Object.keys(SUBTITLE_STYLES) as [SubtitleStyleKey, ...SubtitleStyleKey[]];
const applyInput = z.object({
  rawVideoId: z.string().uuid(),
  styleKey: z.enum(STYLE_KEYS),
});

async function loadOwnedVideo(rawVideoId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, transcription, source_storage_path, cleaned_storage_path')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  if (data.user_id !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return data;
}

export const studioSubtitlesRouter = router({
  getStyles: studioProcedure.query(() => {
    return Object.entries(SUBTITLE_STYLES).map(([key, value]) => ({
      key: key as SubtitleStyleKey,
      label: value.label,
      description: value.description,
      preview: value.preview,
    }));
  }),

  applyStyle: studioProcedure.input(applyInput).mutation(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    if (!video.transcription) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'transcription required' });
    }
    try {
      return await applySubtitlesToVideo({
        rawVideoId: input.rawVideoId,
        styleKey: input.styleKey,
      });
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'subtitles', op: 'applyStyle' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'subtitle apply failed',
      });
    }
  }),

  downloadSrt: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    if (!video.transcription) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'transcription required' });
    }
    const srt = generateSrt(video.transcription);
    return { srt };
  }),
});
