import { describe, expect, it } from 'vitest';
import { computeBreakevenDetailed } from '../lib/scores/breakeven-detailed';

describe('computeBreakevenDetailed', () => {
  const BASE_INPUT = {
    property_price_minor: 4_500_000_00,
    annual_gross_revenue_minor: 1_277_500_00, // escenario Tulum premium ($5000×0.7×365)
    annual_operating_costs_minor: 957_250_00,
    financing: {
      // 50% downpayment reduce debt service a rango que deja base net positivo
      // con este perfil de ingresos. Con 30% downpayment sería breakeven=+Inf.
      downpayment_pct: 0.5,
      loan_rate_annual: 0.11,
      loan_term_years: 20,
    },
    sample_months: 12,
  };

  it('stress test de ocupación -10% empeora vs base (breakeven aumenta o base ya es +Inf)', () => {
    const result = computeBreakevenDetailed(BASE_INPUT);
    // Si base ya está en +Inf, stress también — pero el net_after_debt debe ser ≤ base.
    expect(result.stress.occupancy_minus_10.annual_net_after_debt_minor).toBeLessThanOrEqual(
      result.base.annual_net_after_debt_minor,
    );
  });

  it('stress +200bps incrementa debt service', () => {
    const result = computeBreakevenDetailed(BASE_INPUT);
    expect(result.stress.rate_plus_200bps.annual_net_after_debt_minor).toBeLessThan(
      result.base.annual_net_after_debt_minor,
    );
  });

  it('cash_on_cash_y1_y5 creciente año a año cuando net es positivo', () => {
    const result = computeBreakevenDetailed(BASE_INPUT);
    expect(result.cash_on_cash_y1_y5.length).toBe(5);
    for (let i = 1; i < result.cash_on_cash_y1_y5.length; i += 1) {
      expect(result.cash_on_cash_y1_y5[i]).toBeGreaterThan(result.cash_on_cash_y1_y5[i - 1] ?? 0);
    }
  });

  it('financing summary: downpayment + principal = price', () => {
    const result = computeBreakevenDetailed(BASE_INPUT);
    expect(
      result.financing_summary.downpayment_minor + result.financing_summary.loan_principal_minor,
    ).toBe(BASE_INPUT.property_price_minor);
  });

  it('breakeven_months = +Infinity cuando revenue < costos + debt service', () => {
    const result = computeBreakevenDetailed({
      ...BASE_INPUT,
      annual_gross_revenue_minor: 100_000_00, // revenue muy bajo.
    });
    expect(result.base.breakeven_months).toBe(Number.POSITIVE_INFINITY);
  });

  it('confidence=insufficient_data con sample_months=0', () => {
    const result = computeBreakevenDetailed({ ...BASE_INPUT, sample_months: 0 });
    expect(result.confidence).toBe('insufficient_data');
  });
});
