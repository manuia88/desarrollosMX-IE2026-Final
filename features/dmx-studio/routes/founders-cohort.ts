// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Founders cohort tRPC procedures: checkEligibility (public), claimBadge
// (authenticated).

import { TRPCError } from '@trpc/server';
import {
  FOUNDERS_COHORT_LIMIT,
  getFoundersCohortStatus,
} from '@/features/dmx-studio/lib/waitlist/founders-cohort';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const studioFoundersCohortRouter = router({
  checkEligibility: publicProcedure.query(async () => {
    const supabase = createAdminClient();
    try {
      const status = await getFoundersCohortStatus(supabase);
      return status;
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'founders cohort lookup failed',
      });
    }
  }),

  claimBadge: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_subscriptions')
      .select('id, status, founders_cohort, founders_discount_pct')
      .eq('user_id', ctx.user.id)
      .eq('founders_cohort', true)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    }

    if (!data) {
      return {
        hasBadge: false,
        founders_discount_pct: 0,
        total: FOUNDERS_COHORT_LIMIT,
      } as const;
    }

    return {
      hasBadge: true,
      founders_discount_pct: data.founders_discount_pct,
      total: FOUNDERS_COHORT_LIMIT,
    } as const;
  }),
});
