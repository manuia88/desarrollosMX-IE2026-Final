// F14.F.6 Sprint 5 BIBLIA Tarea 5.4 — FFmpeg cuts apply + smart EDL preview.
// Procedures: getPreview, approveCuts, applyCuts, getCleaned.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { applyEdlCuts } from '@/features/dmx-studio/lib/raw-video-cutter/edl-applier';
import { getEdlPreview } from '@/features/dmx-studio/lib/raw-video-cutter/smart-edl-preview';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const idInput = z.object({ rawVideoId: z.string().uuid() });
const approveInput = z.object({
  rawVideoId: z.string().uuid(),
  approvedCutIndices: z.array(z.number().int().min(0)),
});

async function loadOwnedVideo(rawVideoId: string, userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_raw_videos')
    .select(
      'id, user_id, edl, cuts_applied, cleaned_storage_path, duration_seconds, source_storage_path',
    )
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  if (data.user_id !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return data;
}

export const studioCutsRouter = router({
  getPreview: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    if (!Array.isArray(video.edl) || video.edl.length === 0) {
      return { cuts: [] };
    }
    try {
      return await getEdlPreview(input.rawVideoId);
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'cuts', op: 'preview' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'preview failed',
      });
    }
  }),

  approveCuts: studioProcedure.input(approveInput).mutation(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    const fullEdl = Array.isArray(video.edl) ? video.edl : [];
    const approved = input.approvedCutIndices
      .filter((i) => i >= 0 && i < fullEdl.length)
      .map((i) => fullEdl[i])
      .filter((c): c is NonNullable<typeof c> => c != null);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_raw_videos')
      .update({
        edl: approved as unknown as never,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.rawVideoId);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { approvedCount: approved.length };
  }),

  applyCuts: studioProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    if (video.cuts_applied) {
      throw new TRPCError({ code: 'CONFLICT', message: 'cuts already applied' });
    }
    if (!Array.isArray(video.edl) || video.edl.length === 0) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'edl empty — nothing to cut' });
    }
    try {
      return await applyEdlCuts(input.rawVideoId);
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'cuts', op: 'apply' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'apply failed',
      });
    }
  }),

  getCleaned: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const video = await loadOwnedVideo(input.rawVideoId, ctx.user.id);
    return {
      cutsApplied: video.cuts_applied,
      cleanedStoragePath: video.cleaned_storage_path,
    };
  }),
});
