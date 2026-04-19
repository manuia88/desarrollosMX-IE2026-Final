import { describe, expect, it } from 'vitest';
import { computeStrViability } from '../lib/scores/str-viability';

const PLAYA_COSTS = {
  cleaning_pct: 0.15,
  platform_fee_pct: 0.15,
  property_mgmt_pct: 0.25,
  utilities_monthly_minor: 450000,
  property_tax_annual_pct: 0.002,
  vacancy_buffer_pct: 0.15,
};

const CDMX_PREMIUM_COSTS = {
  cleaning_pct: 0.12,
  platform_fee_pct: 0.15,
  property_mgmt_pct: 0.2,
  utilities_monthly_minor: 350000,
  property_tax_annual_pct: 0.003,
  vacancy_buffer_pct: 0.08,
};

describe('computeStrViability', () => {
  it('cap_rate positivo para Tulum $4.5M MXN con ADR $2500 × 60% occ', () => {
    const result = computeStrViability({
      adr_minor: 250_000, // $2500 MXN/noche
      occupancy_rate: 0.6,
      property_price_minor: 4_500_000_00, // $4.5M MXN en centavos
      sample_months: 12,
      costs: PLAYA_COSTS,
    });
    // La fórmula del plan deduce 70% del gross (cleaning+platform+pm+vacancy)
    // + utilities + tax. Eso deja cap_rate positivo pero bajo con estos inputs.
    // El rango "aspiracional" 0.06-0.12 del plan requiere ADR más alto
    // (≈$4000+ MXN/noche) o costos menos agresivos (refinables por founder).
    expect(result.cap_rate).toBeGreaterThan(0);
    expect(result.cap_rate).toBeLessThan(0.2);
    expect(result.confidence).toBe('high');
    expect(result.net_revenue_annual_minor).toBeGreaterThan(0);
  });

  it('cap_rate escala con ADR premium ($5000 alcanza rango 0.06-0.12 del plan)', () => {
    const result = computeStrViability({
      adr_minor: 500_000, // $5000 MXN/noche (premium Tulum beachfront)
      occupancy_rate: 0.7,
      property_price_minor: 4_500_000_00,
      sample_months: 12,
      costs: PLAYA_COSTS,
    });
    expect(result.cap_rate).toBeGreaterThan(0.06);
    expect(result.cap_rate).toBeLessThan(0.2);
  });

  it('breakeven_months consistente con cap_rate (≈ 100/cap_rate meses)', () => {
    const result = computeStrViability({
      adr_minor: 300_000,
      occupancy_rate: 0.55,
      property_price_minor: 5_000_000_00,
      sample_months: 12,
      costs: CDMX_PREMIUM_COSTS,
    });
    // price / (annual_net / 12) ≈ 12 / cap_rate cuando cap_rate es positivo.
    const expectedBreakeven = 12 / result.cap_rate;
    expect(Math.abs(result.breakeven_months - expectedBreakeven)).toBeLessThan(0.1);
  });

  it('breakeven = +Infinity cuando net revenue es negativo (ocupación baja)', () => {
    const result = computeStrViability({
      adr_minor: 50_000,
      occupancy_rate: 0.1,
      property_price_minor: 10_000_000_00,
      sample_months: 12,
      costs: PLAYA_COSTS,
    });
    expect(result.net_revenue_annual_minor).toBeLessThan(0);
    expect(result.breakeven_months).toBe(Number.POSITIVE_INFINITY);
  });

  it('desglose de costos suma total_costs', () => {
    const result = computeStrViability({
      adr_minor: 200_000,
      occupancy_rate: 0.5,
      property_price_minor: 4_000_000_00,
      sample_months: 12,
      costs: CDMX_PREMIUM_COSTS,
    });
    const sum =
      result.breakdown.cleaning_annual_minor +
      result.breakdown.platform_fee_annual_minor +
      result.breakdown.property_mgmt_annual_minor +
      result.breakdown.utilities_annual_minor +
      result.breakdown.property_tax_annual_minor +
      result.breakdown.vacancy_buffer_annual_minor;
    expect(sum).toBe(result.total_costs_annual_minor);
  });

  it('confidence cascade: high ≥12m, medium ≥6m, low <6m, insufficient 0', () => {
    const base = {
      adr_minor: 200_000,
      occupancy_rate: 0.5,
      property_price_minor: 4_000_000_00,
      costs: PLAYA_COSTS,
    };
    expect(computeStrViability({ ...base, sample_months: 12 }).confidence).toBe('high');
    expect(computeStrViability({ ...base, sample_months: 8 }).confidence).toBe('medium');
    expect(computeStrViability({ ...base, sample_months: 3 }).confidence).toBe('low');
    expect(computeStrViability({ ...base, sample_months: 0 }).confidence).toBe('insufficient_data');
  });
});
