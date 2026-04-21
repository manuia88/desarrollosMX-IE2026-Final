import { TRPCError } from '@trpc/server';
import { generateCausalExplanation } from '@/features/causal-engine/lib/causal-engine';
import { checkDailyCostLimit } from '@/features/causal-engine/lib/cost-guard';
import {
  getCausalExplanationInput,
  regenerateCausalExplanationInput,
} from '@/features/causal-engine/schemas/causal';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import {
  checkRateLimit,
  getClientIp,
  globalKey,
  ipKey,
  userKey,
} from '@/shared/lib/security/rate-limit';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const READ_WINDOW_SEC = 3600;
const READ_MAX_CALLS = 30;
const REGENERATE_WINDOW_SEC = 3600;
const REGENERATE_MAX_CALLS = 10;

function resolveIpKey(headers: Headers | undefined): ReturnType<typeof ipKey> {
  if (!headers) return globalKey('causal.getExplanation');
  const pseudoRequest = { headers } as unknown as Request;
  const ip = getClientIp(pseudoRequest);
  if (ip === 'unknown') return globalKey('causal.getExplanation');
  return ipKey(pseudoRequest);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const causalRouter = router({
  getExplanation: publicProcedure.input(getCausalExplanationInput).query(async ({ input, ctx }) => {
    const key = resolveIpKey(ctx.headers);
    const limit = await checkRateLimit(
      key,
      'causal.getExplanation',
      READ_WINDOW_SEC,
      READ_MAX_CALLS,
    );
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }
    const supabase = createAdminClient();
    const costCheck = await checkDailyCostLimit({ supabase });
    try {
      return await generateCausalExplanation({
        scoreId: input.scoreId,
        indexCode: input.indexCode,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        periodDate: input.periodDate ?? todayIsoDate(),
        supabase,
        costGuardAllowed: costCheck.allowed,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'causal_engine_failed';
      if (msg === 'COST_BUDGET_EXCEEDED') {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'cost_budget_exceeded' });
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),

  regenerate: authenticatedProcedure
    .input(regenerateCausalExplanationInput)
    .mutation(async ({ input, ctx }) => {
      const rlKey = userKey(ctx.user.id);
      const limit = await checkRateLimit(
        rlKey,
        'causal.regenerate',
        REGENERATE_WINDOW_SEC,
        REGENERATE_MAX_CALLS,
      );
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }
      const supabase = createAdminClient();
      const costCheck = await checkDailyCostLimit({ supabase });
      try {
        return await generateCausalExplanation({
          scoreId: input.scoreId,
          indexCode: input.indexCode,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          periodDate: input.periodDate ?? todayIsoDate(),
          supabase,
          forceRegenerate: true,
          costGuardAllowed: costCheck.allowed,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'causal_engine_failed';
        if (msg === 'COST_BUDGET_EXCEEDED') {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'cost_budget_exceeded' });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
      }
    }),
});

export type CausalRouter = typeof causalRouter;
