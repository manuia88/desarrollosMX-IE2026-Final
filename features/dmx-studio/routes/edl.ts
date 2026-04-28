// F14.F.6 Sprint 5 BIBLIA Tarea 5.3 — EDL + chapters procedures.
// Procedures: analyze, getEdl, getChapters, editChapter.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { analyzeRawVideo } from '@/features/dmx-studio/lib/director/raw-video-analyzer';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const idInput = z.object({ rawVideoId: z.string().uuid() });

const editChapterInput = z.object({
  rawVideoId: z.string().uuid(),
  chapterIndex: z.number().int().min(0),
  title: z.string().min(1).max(120),
});

async function loadOwnedVideo(rawVideoId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, transcription, transcription_status, edl, chapters, duration_seconds')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  if (data.user_id !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return data;
}

export const studioEdlRouter = router({
  analyze: studioProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    if (video.transcription_status !== 'completed') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `transcription_status=${video.transcription_status}; required=completed`,
      });
    }
    try {
      return await analyzeRawVideo(input.rawVideoId);
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'edl', op: 'analyze' },
        extra: { rawVideoId: input.rawVideoId },
      });
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'analyze failed',
      });
    }
  }),

  getEdl: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    return { edl: video.edl ?? null };
  }),

  getChapters: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    return { chapters: video.chapters ?? null };
  }),

  editChapter: studioProcedure.input(editChapterInput).mutation(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    const chapters = Array.isArray(video.chapters) ? [...video.chapters] : [];
    if (input.chapterIndex >= chapters.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'chapter index out of range' });
    }
    const target = chapters[input.chapterIndex] as Record<string, unknown> | undefined;
    if (!target) throw new TRPCError({ code: 'NOT_FOUND' });
    chapters[input.chapterIndex] = { ...target, title: input.title };
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_raw_videos')
      .update({ chapters, updated_at: new Date().toISOString() })
      .eq('id', input.rawVideoId);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { chapters };
  }),
});
