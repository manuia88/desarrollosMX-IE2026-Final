import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const studioLandingRouter = router({
  getPublicMetrics: publicProcedure.query(async () => {
    const supabase = createAdminClient();
    const [waitlistRes, asesorRes, foundersUsedRes] = await Promise.all([
      supabase.from('studio_waitlist').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('rol', 'asesor')
        .eq('is_active', true),
      supabase
        .from('studio_waitlist')
        .select('id', { count: 'exact', head: true })
        .eq('founders_cohort_eligible', true),
    ]);
    if (waitlistRes.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: waitlistRes.error });
    }
    if (asesorRes.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: asesorRes.error });
    }
    if (foundersUsedRes.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: foundersUsedRes.error });
    }
    const waitlistCount = waitlistRes.count ?? 0;
    const asesoresCount = asesorRes.count ?? 0;
    const foundersUsed = foundersUsedRes.count ?? 0;
    const foundersTotal = 50;
    return {
      waitlistCount,
      asesoresCount,
      foundersTotal,
      foundersUsed,
      foundersRemaining: Math.max(foundersTotal - foundersUsed, 0),
    };
  }),
});
