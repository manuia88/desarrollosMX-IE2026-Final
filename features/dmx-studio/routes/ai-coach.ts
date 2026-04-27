// F14.F.5 Sprint 4 UPGRADE 8 LATERAL — DMX Studio AI coach diario.
// Owned por sub-agent 5. Procedures: getSessionToday + recordResponse + dismissSession.
//
// STUB ADR-018 — Full chat (multi-turn) defer H2 L-NEW-AI-COACH-FULL-CHAT-EXTEND.
// H1 sólo 1 mensaje + acknowledge buttons.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { dismissSession, getDailyCoachSession, recordResponse } from '../lib/ai-coach';
import { studioProcedure } from './_studio-procedure';

const recordResponseInput = z.object({
  sessionId: z.string().uuid(),
  response: z.string().min(1).max(2000),
  completed: z.boolean(),
});

const dismissInput = z.object({
  sessionId: z.string().uuid(),
});

export const studioAiCoachRouter = router({
  getSessionToday: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    try {
      return await getDailyCoachSession(supabase, ctx.user.id);
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'getSessionToday failed',
        cause: err,
      });
    }
  }),

  recordResponse: studioProcedure.input(recordResponseInput).mutation(async ({ input }) => {
    const supabase = createAdminClient();
    try {
      return await recordResponse(supabase, input.sessionId, input.response, input.completed);
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'recordResponse failed',
        cause: err,
      });
    }
  }),

  dismissSession: studioProcedure.input(dismissInput).mutation(async ({ input }) => {
    const supabase = createAdminClient();
    try {
      return await dismissSession(supabase, input.sessionId);
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'dismissSession failed',
        cause: err,
      });
    }
  }),
});
