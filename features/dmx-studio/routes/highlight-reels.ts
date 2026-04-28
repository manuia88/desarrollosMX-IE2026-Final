// F14.F.6 Sprint 5 BIBLIA LATERAL 8 — Highlight reels.
// Procedures: list, generate, getById.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { generateHighlightReels } from '@/features/dmx-studio/lib/raw-video-cutter/highlight-reels-generator';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const idInput = z.object({ rawVideoId: z.string().uuid() });
const reelIdInput = z.object({ id: z.string().uuid() });

const MIN_DURATION_FOR_REELS_SECONDS = 5 * 60;

export const studioHighlightReelsRouter = router({
  list: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_highlight_reels')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('source_raw_video_id', input.rawVideoId)
      .order('clip_index', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  generate: studioProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    const { data: video, error: vErr } = await supabase
      .from('studio_raw_videos')
      .select('id, user_id, duration_seconds, transcription, transcription_status, edl')
      .eq('id', input.rawVideoId)
      .maybeSingle();
    if (vErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: vErr });
    if (!video) throw new TRPCError({ code: 'NOT_FOUND' });
    if (video.user_id !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    if (video.transcription_status !== 'completed') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'transcription must be completed',
      });
    }
    const duration = Number(video.duration_seconds ?? 0);
    if (duration < MIN_DURATION_FOR_REELS_SECONDS) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'video must be > 5 min for highlight reels',
      });
    }
    try {
      return await generateHighlightReels(input.rawVideoId);
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'highlight-reels', op: 'generate' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'generate failed',
      });
    }
  }),

  getById: studioProcedure.input(reelIdInput).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_highlight_reels')
      .select('*')
      .eq('id', input.id)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),
});
