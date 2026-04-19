import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const strHostsRouter = router({
  top: authenticatedProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_hosts')
        .select(
          'host_id, display_name, country_code, listings_count, super_host_score, tier, churn_risk, avg_rating, avg_occupancy_rate, superhost_flag, last_updated_at',
        )
        .eq('country_code', input.country_code)
        .order('super_host_score', { ascending: false, nullsFirst: false })
        .limit(input.limit);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  atRisk: authenticatedProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        min_risk: z.number().min(0).max(1).default(0.5),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_hosts')
        .select(
          'host_id, display_name, country_code, listings_count, super_host_score, tier, churn_risk, meta',
        )
        .eq('country_code', input.country_code)
        .gte('churn_risk', input.min_risk)
        .order('churn_risk', { ascending: false })
        .limit(input.limit);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),
});
