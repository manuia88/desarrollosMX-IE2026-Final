import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { computeBreakevenDetailed } from '../lib/scores/breakeven-detailed';
import { computeStrViability } from '../lib/scores/str-viability';
import { strBreakevenComputeInput } from '../schemas/breakeven';

// BANXICO_SF43878 — "Costo Anual Total de crédito hipotecario promedio
// mensual (tasa efectiva)". Se consulta en macro_series; fallback si no hay.
const FALLBACK_MORTGAGE_RATE = 0.11; // 11% como default conservador MX 2026.

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
    const premium = new Set(['Roma Norte', 'Condesa', 'Hipódromo', 'Polanco', 'Juárez']);
    return district && premium.has(district) ? 'cdmx_premium' : 'cdmx_standard';
  }
  return 'regional';
}

export const strBreakevenRouter = router({
  compute: authenticatedProcedure.input(strBreakevenComputeInput).query(async ({ input }) => {
    const supabase = createAdminClient();

    const { data: marketRow, error: marketErr } = await supabase
      .from('str_markets')
      .select('country_code, airroi_locality, airroi_district')
      .eq('id', input.market_id)
      .single();
    if (marketErr || !marketRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'market_not_found' });
    }

    const zoneTier =
      input.zone_tier ?? defaultZoneTierFor(marketRow.airroi_locality, marketRow.airroi_district);

    const { data: costRow } = await supabase
      .from('str_cost_assumptions')
      .select(
        'cleaning_pct, platform_fee_pct, property_mgmt_pct, utilities_monthly_minor, property_tax_annual_pct, vacancy_buffer_pct',
      )
      .eq('country_code', marketRow.country_code)
      .eq('zone_tier', zoneTier)
      .single();
    if (!costRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'cost_assumptions_missing' });
    }

    const { data: aggs } = await supabase
      .from('str_market_monthly_aggregates')
      .select('occupancy_rate, adr_minor')
      .eq('market_id', input.market_id)
      .order('period', { ascending: false })
      .limit(input.num_months);
    const occs = (aggs ?? []).map((r) => r.occupancy_rate).filter((v): v is number => v != null);
    const adrs = (aggs ?? []).map((r) => r.adr_minor).filter((v): v is number => v != null);
    const occAvg = occs.length ? occs.reduce((a, b) => a + b, 0) / occs.length : 0;
    const adrAvg = adrs.length ? adrs.reduce((a, b) => a + b, 0) / adrs.length : 0;

    const viability = computeStrViability({
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

    let loanRate = input.loan_rate_annual_override;
    if (loanRate == null) {
      const { data: macroRow } = await supabase
        .from('macro_series')
        .select('value, period_start')
        .eq('country_code', marketRow.country_code)
        .eq('series_id', 'SF43878')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      // Banxico devuelve tasa en % (e.g. 10.5). Normalizar a decimal.
      if (macroRow?.value != null) {
        const raw = Number(macroRow.value);
        loanRate = raw > 1 ? raw / 100 : raw;
      } else {
        loanRate = FALLBACK_MORTGAGE_RATE;
      }
    }

    const breakeven = computeBreakevenDetailed({
      property_price_minor: input.property_price_minor,
      annual_gross_revenue_minor: viability.gross_revenue_annual_minor,
      annual_operating_costs_minor: viability.total_costs_annual_minor,
      financing: {
        downpayment_pct: input.downpayment_pct,
        loan_rate_annual: loanRate,
        loan_term_years: input.loan_term_years,
      },
      sample_months: aggs?.length ?? 0,
    });

    return {
      market_id: input.market_id,
      zone_tier: zoneTier,
      viability,
      breakeven,
      financing_rate_used: loanRate,
      rate_source: input.loan_rate_annual_override != null ? 'override' : 'banxico_or_fallback',
    };
  }),
});
