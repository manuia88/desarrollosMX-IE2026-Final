import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { orchestrate } from '@/shared/lib/ai/agents';
import { aiAskInputSchema } from '../schemas/ai';

export const aiRouter = router({
  ask: authenticatedProcedure.input(aiAskInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const result = await orchestrate({
        query: input.query,
        userId: ctx.user.id,
        ...(input.context_summary ? { contextSummary: input.context_summary } : {}),
        fallbackCategory: 'fast',
      });
      return result;
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'ai_ask_failed',
      });
    }
  }),
});
