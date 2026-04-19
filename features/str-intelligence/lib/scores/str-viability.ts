// STR Investment Viability calculator (FASE 07b / BLOQUE 7b.B).
//
// Inputs:
//   - market stats (ADR, occupancy) desde str_market_monthly_aggregates.
//   - cost assumptions (cleaning/platform/pm/utilities/tax/vacancy) desde str_cost_assumptions.
//   - property price minor (MXN centavos) del user o valuador DMX.
//
// Outputs:
//   - gross_revenue_annual_minor
//   - net_revenue_annual_minor (tras costos).
//   - cap_rate (net / price).
//   - breakeven_months (price / monthly_net).
//   - margin_pct (net / gross).
//   - confidence cascade basado en sample_size.

export interface StrViabilityInput {
  readonly adr_minor: number;
  readonly occupancy_rate: number; // 0..1
  readonly property_price_minor: number;
  readonly sample_months: number;
  readonly costs: {
    readonly cleaning_pct: number;
    readonly platform_fee_pct: number;
    readonly property_mgmt_pct: number;
    readonly utilities_monthly_minor: number;
    readonly property_tax_annual_pct: number;
    readonly vacancy_buffer_pct: number;
  };
}

export type ViabilityConfidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface StrViabilityResult {
  readonly gross_revenue_annual_minor: number;
  readonly net_revenue_annual_minor: number;
  readonly total_costs_annual_minor: number;
  readonly cap_rate: number; // 0..1 (ratio, not pct).
  readonly breakeven_months: number; // positive if net>0, else +Infinity.
  readonly margin_pct: number; // 0..1 (net/gross) o 0 si gross=0.
  readonly confidence: ViabilityConfidence;
  readonly breakdown: {
    readonly cleaning_annual_minor: number;
    readonly platform_fee_annual_minor: number;
    readonly property_mgmt_annual_minor: number;
    readonly utilities_annual_minor: number;
    readonly property_tax_annual_minor: number;
    readonly vacancy_buffer_annual_minor: number;
  };
}

export function computeStrViability(input: StrViabilityInput): StrViabilityResult {
  const { adr_minor, occupancy_rate, property_price_minor, sample_months, costs } = input;

  const grossRevenueAnnual = Math.round(adr_minor * occupancy_rate * 365);
  const cleaningAnnual = Math.round(grossRevenueAnnual * costs.cleaning_pct);
  const platformFeeAnnual = Math.round(grossRevenueAnnual * costs.platform_fee_pct);
  const propertyMgmtAnnual = Math.round(grossRevenueAnnual * costs.property_mgmt_pct);
  const utilitiesAnnual = costs.utilities_monthly_minor * 12;
  const propertyTaxAnnual = Math.round(property_price_minor * costs.property_tax_annual_pct);
  const vacancyBufferAnnual = Math.round(grossRevenueAnnual * costs.vacancy_buffer_pct);

  const totalCosts =
    cleaningAnnual +
    platformFeeAnnual +
    propertyMgmtAnnual +
    utilitiesAnnual +
    propertyTaxAnnual +
    vacancyBufferAnnual;

  const netRevenueAnnual = grossRevenueAnnual - totalCosts;
  const capRate = property_price_minor > 0 ? netRevenueAnnual / property_price_minor : 0;
  const monthlyNet = netRevenueAnnual / 12;
  const breakevenMonths =
    monthlyNet > 0 ? property_price_minor / monthlyNet : Number.POSITIVE_INFINITY;
  const marginPct = grossRevenueAnnual > 0 ? netRevenueAnnual / grossRevenueAnnual : 0;

  const confidence: ViabilityConfidence = (() => {
    if (sample_months === 0) return 'insufficient_data';
    if (sample_months >= 12) return 'high';
    if (sample_months >= 6) return 'medium';
    return 'low';
  })();

  return {
    gross_revenue_annual_minor: grossRevenueAnnual,
    net_revenue_annual_minor: netRevenueAnnual,
    total_costs_annual_minor: totalCosts,
    cap_rate: Math.round(capRate * 10000) / 10000,
    breakeven_months: Number.isFinite(breakevenMonths)
      ? Math.round(breakevenMonths * 100) / 100
      : breakevenMonths,
    margin_pct: Math.round(marginPct * 10000) / 10000,
    confidence,
    breakdown: {
      cleaning_annual_minor: cleaningAnnual,
      platform_fee_annual_minor: platformFeeAnnual,
      property_mgmt_annual_minor: propertyMgmtAnnual,
      utilities_annual_minor: utilitiesAnnual,
      property_tax_annual_minor: propertyTaxAnnual,
      vacancy_buffer_annual_minor: vacancyBufferAnnual,
    },
  };
}
