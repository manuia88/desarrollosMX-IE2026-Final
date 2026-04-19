import { describe, expect, it } from 'vitest';
import {
  computeStrBaseline,
  STR_BASELINE_WEIGHTS,
  type StrBaselineInputPeriod,
} from '../lib/scores/str-baseline';

function mockPeriods(
  count: number,
  baseOccupancy: number,
  baseRevpar: number,
): StrBaselineInputPeriod[] {
  return Array.from({ length: count }, (_, i) => ({
    period: `2026-${String(i + 1).padStart(2, '0')}-01`,
    occupancy_rate: baseOccupancy + (i % 3) * 0.02,
    revpar_minor: baseRevpar + i * 1000,
  }));
}

describe('computeStrBaseline', () => {
  it('pesos suman 1 (invariant)', () => {
    const sum =
      STR_BASELINE_WEIGHTS.occupancy +
      STR_BASELINE_WEIGHTS.revpar +
      STR_BASELINE_WEIGHTS.volatility +
      STR_BASELINE_WEIGHTS.sample;
    expect(sum).toBeCloseTo(1, 6);
  });

  it('retorna score 0-100 con 12m de datos estables', () => {
    const result = computeStrBaseline({
      periods: mockPeriods(12, 0.55, 1_200_00),
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBe('medium'); // sin benchmark → medium.
    expect(result.metrics.periods_available).toBe(12);
  });

  it('confidence=high cuando hay 12m + benchmark', () => {
    const result = computeStrBaseline({
      periods: mockPeriods(12, 0.55, 1_200_00),
      benchmark: { occupancy_rate_avg: 0.5, revpar_minor_avg: 1_000_00 },
    });
    expect(result.confidence).toBe('high');
    expect(result.metrics.benchmark_ratio_occupancy).toBeGreaterThan(1);
    expect(result.metrics.benchmark_ratio_revpar).toBeGreaterThan(1);
  });

  it('confidence=insufficient_data cuando no hay periodos', () => {
    const result = computeStrBaseline({ periods: [] });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.score).toBe(0);
  });

  it('maneja nulls sin crashear (periodos incompletos)', () => {
    const result = computeStrBaseline({
      periods: [
        { period: '2026-01-01', occupancy_rate: null, revpar_minor: null },
        { period: '2026-02-01', occupancy_rate: 0.5, revpar_minor: 1_000_00 },
      ],
    });
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.components.occupancy).toBeGreaterThan(0);
  });

  it('sub-market con benchmark ratio > 1 puntúa mejor que su benchmark', () => {
    const subMarket = computeStrBaseline({
      periods: mockPeriods(12, 0.7, 1_800_00),
      benchmark: { occupancy_rate_avg: 0.5, revpar_minor_avg: 1_000_00 },
    });
    const sameAsBenchmark = computeStrBaseline({
      periods: mockPeriods(12, 0.5, 1_000_00),
      benchmark: { occupancy_rate_avg: 0.5, revpar_minor_avg: 1_000_00 },
    });
    expect(subMarket.score).toBeGreaterThan(sameAsBenchmark.score);
  });

  it('alta volatilidad penaliza el volatility_component', () => {
    const stable = computeStrBaseline({
      periods: Array.from({ length: 12 }, (_, i) => ({
        period: `2026-${String(i + 1).padStart(2, '0')}-01`,
        occupancy_rate: 0.55,
        revpar_minor: 1_000_00,
      })),
    });
    const volatile = computeStrBaseline({
      periods: Array.from({ length: 12 }, (_, i) => ({
        period: `2026-${String(i + 1).padStart(2, '0')}-01`,
        occupancy_rate: i % 2 === 0 ? 0.2 : 0.9,
        revpar_minor: 1_000_00,
      })),
    });
    expect(stable.components.volatility).toBeGreaterThan(volatile.components.volatility);
  });
});
