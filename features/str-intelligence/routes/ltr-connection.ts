import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { computeLtrStrOpportunity, type LtrStrRegime } from '../lib/scores/str-ltr-opportunity';

const VALID_REGIMES: readonly LtrStrRegime[] = [
  'str_strongly_outperforms',
  'str_outperforms',
  'parity',
  'ltr_outperforms',
  'unknown',
];

function isRegime(v: string): v is LtrStrRegime {
  return (VALID_REGIMES as readonly string[]).includes(v);
}

export const ltrStrConnectionRouter = router({
  getForZone: authenticatedProcedure
    .input(z.object({ zone_id: z.string().uuid() }))
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('v_ltr_str_connection')
        .select(
          'zone_id, country_code, currency, ltr_monthly_rent_median_minor, ltr_sample_listings, str_monthly_revenue_median_minor, str_sample_months, str_ltr_ratio, regime',
        )
        .eq('zone_id', input.zone_id)
        .maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'no_connection_data_for_zone' });
      }

      const regime = data.regime && isRegime(data.regime) ? data.regime : 'unknown';
      const opportunity = computeLtrStrOpportunity({
        str_ltr_ratio: data.str_ltr_ratio != null ? Number(data.str_ltr_ratio) : null,
        regime,
        str_sample_months: Number(data.str_sample_months ?? 0),
        ltr_sample_listings: Number(data.ltr_sample_listings ?? 0),
      });

      return {
        zone_id: input.zone_id,
        country_code: data.country_code,
        currency: data.currency,
        ltr_monthly_rent_median_minor: data.ltr_monthly_rent_median_minor,
        str_monthly_revenue_median_minor: data.str_monthly_revenue_median_minor,
        ...opportunity,
      };
    }),

  listRegulations: authenticatedProcedure
    .input(z.object({ country_code: z.string().length(2) }))
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_zone_regulations')
        .select(
          'id, country_code, zone_id, market_id, restriction_type, source_url, effective_date, notes, captured_at',
        )
        .eq('country_code', input.country_code)
        .order('captured_at', { ascending: false });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),
});
