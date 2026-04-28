// F14.F.6 Sprint 5 BIBLIA LATERAL 6+7 — Speech analytics + benchmarks.
// Procedures: getByVideo, getUserStats, getBenchmarks.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  compareToBenchmarks,
  TOP_INMOBILIARIO_BENCHMARKS,
} from '@/features/dmx-studio/lib/speech-analytics/benchmarks';
import { calculateAnalytics } from '@/features/dmx-studio/lib/speech-analytics/calculator';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

const idInput = z.object({ rawVideoId: z.string().uuid() });

export const studioSpeechAnalyticsRouter = router({
  getByVideo: studioProcedure.input(idInput).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_speech_analytics')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('raw_video_id', input.rawVideoId)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  calculate: studioProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    try {
      return await calculateAnalytics({ rawVideoId: input.rawVideoId, userId: ctx.user.id });
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'speech-analytics', op: 'calculate' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'analytics failed',
      });
    }
  }),

  getUserStats: studioProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_speech_analytics')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('calculated_at', { ascending: false })
        .limit(input?.limit ?? 50);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return data ?? [];
    }),

  getBenchmarks: studioProcedure.input(idInput.optional()).query(async ({ input, ctx }) => {
    if (!input?.rawVideoId) {
      return { benchmarks: TOP_INMOBILIARIO_BENCHMARKS, comparison: null };
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_speech_analytics')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('raw_video_id', input.rawVideoId)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) return { benchmarks: TOP_INMOBILIARIO_BENCHMARKS, comparison: null };
    return {
      benchmarks: TOP_INMOBILIARIO_BENCHMARKS,
      comparison: compareToBenchmarks(data),
    };
  }),
});
