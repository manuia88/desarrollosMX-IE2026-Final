// F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio community challenges (Strava Segments).
// Owned por sub-agent 5. Procedures: getCurrentWeek + participate + getLeaderboard.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  getCurrentWeekChallenge,
  getLeaderboard,
  participateInChallenge,
} from '../lib/community-challenges';
import { studioProcedure } from './_studio-procedure';

const participateInput = z.object({
  challengeId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
});

const leaderboardInput = z.object({
  challengeId: z.string().uuid(),
});

export const studioChallengesRouter = router({
  getCurrentWeek: studioProcedure.query(async () => {
    const supabase = createAdminClient();
    try {
      return await getCurrentWeekChallenge(supabase);
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'getCurrentWeek failed',
        cause: err,
      });
    }
  }),

  participate: studioProcedure.input(participateInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    try {
      return await participateInChallenge(
        supabase,
        input.challengeId,
        ctx.user.id,
        input.projectId ?? null,
      );
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'participate failed',
        cause: err,
      });
    }
  }),

  getLeaderboard: studioProcedure.input(leaderboardInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    try {
      return await getLeaderboard(supabase, input.challengeId, 10);
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'getLeaderboard failed',
        cause: err,
      });
    }
  }),
});
