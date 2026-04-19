import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { computeStrViability } from '../lib/scores/str-viability';
import { strViabilityGetForPropertyInput } from '../schemas/viability';

function defaultZoneTierFor(
  locality: string | null,
  district: string | null,
): 'cdmx_premium' | 'cdmx_standard' | 'playa' | 'regional' {
  if (!locality) return 'regional';
  const loc = locality.toLowerCase();
  if (
    ['tulum', 'playa del carmen', 'cancún', 'cancun', 'puerto vallarta', 'los cabos'].includes(loc)
  ) {
    return 'playa';
  }
  if (loc === 'mexico city' || loc === 'ciudad de méxico') {
    const premiumDistricts = new Set(['Roma Norte', 'Condesa', 'Hipódromo', 'Polanco', 'Juárez']);
    return district && premiumDistricts.has(district) ? 'cdmx_premium' : 'cdmx_standard';
  }
  return 'regional';
}

export const strViabilityRouter = router({
  getForProperty: authenticatedProcedure
    .input(strViabilityGetForPropertyInput)
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      const { data: marketRow, error: marketErr } = await supabase
        .from('str_markets')
        .select('airroi_locality, airroi_district, country_code, native_currency')
        .eq('id', input.market_id)
        .single();
      if (marketErr || !marketRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'market_not_found' });
      }

      const zoneTier =
        input.zone_tier ?? defaultZoneTierFor(marketRow.airroi_locality, marketRow.airroi_district);

      const { data: costRow, error: costErr } = await supabase
        .from('str_cost_assumptions')
        .select(
          'cleaning_pct, platform_fee_pct, property_mgmt_pct, utilities_monthly_minor, property_tax_annual_pct, vacancy_buffer_pct, currency',
        )
        .eq('country_code', marketRow.country_code)
        .eq('zone_tier', zoneTier)
        .single();
      if (costErr || !costRow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `cost_assumptions_not_seeded: ${marketRow.country_code}/${zoneTier}`,
        });
      }

      const { data: aggs, error: aggsErr } = await supabase
        .from('str_market_monthly_aggregates')
        .select('occupancy_rate, adr_minor')
        .eq('market_id', input.market_id)
        .order('period', { ascending: false })
        .limit(input.num_months);
      if (aggsErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: aggsErr.message });
      }

      const occs = (aggs ?? []).map((r) => r.occupancy_rate).filter((v): v is number => v != null);
      const adrs = (aggs ?? []).map((r) => r.adr_minor).filter((v): v is number => v != null);
      const occAvg = occs.length ? occs.reduce((a, b) => a + b, 0) / occs.length : 0;
      const adrAvg = adrs.length ? adrs.reduce((a, b) => a + b, 0) / adrs.length : 0;

      const result = computeStrViability({
        adr_minor: adrAvg,
        occupancy_rate: occAvg,
        property_price_minor: input.property_price_minor,
        sample_months: aggs?.length ?? 0,
        costs: {
          cleaning_pct: Number(costRow.cleaning_pct),
          platform_fee_pct: Number(costRow.platform_fee_pct),
          property_mgmt_pct: Number(costRow.property_mgmt_pct),
          utilities_monthly_minor: Number(costRow.utilities_monthly_minor),
          property_tax_annual_pct: Number(costRow.property_tax_annual_pct),
          vacancy_buffer_pct: Number(costRow.vacancy_buffer_pct),
        },
      });

      return {
        market_id: input.market_id,
        zone_tier: zoneTier,
        currency: costRow.currency,
        ...result,
        inputs: {
          adr_minor_avg: Math.round(adrAvg),
          occupancy_rate_avg: Math.round(occAvg * 10000) / 10000,
          sample_months: aggs?.length ?? 0,
        },
      };
    }),
});
