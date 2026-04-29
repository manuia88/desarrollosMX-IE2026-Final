import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_METRICS,
  percentileOf,
  runBenchmarkEngine,
} from '@/shared/lib/upg/benchmark-engine';
import { runFeasibilityEngine } from '@/shared/lib/upg/feasibility-engine';
import { runManzanaAnalyzer } from '@/shared/lib/upg/manzana-analyzer';

describe('benchmark-engine', () => {
  it('exposes 4 canonical metrics', () => {
    expect(BENCHMARK_METRICS.length).toBe(4);
    expect(BENCHMARK_METRICS).toContain('absorption_rate_monthly');
    expect(BENCHMARK_METRICS).toContain('price_per_m2_avg_mxn');
  });

  it('percentileOf returns 100 for max, 0 for min', () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(percentileOf(50, sorted)).toBe(100);
    expect(percentileOf(0, sorted)).toBe(0);
    expect(percentileOf(30, sorted)).toBe(60);
  });

  it('runBenchmarkEngine declares observed disclosure with cohort >= 20', () => {
    const cohort = Array.from({ length: 25 }, (_, i) => ({
      desarrolladoraId: `dev-${i}`,
      value: (i + 1) * 100,
    }));
    const result = runBenchmarkEngine({
      metric: 'price_per_m2_avg_mxn',
      value: 1500,
      cohort,
    });
    expect(result.cohortSize).toBe(25);
    expect(result.disclosure).toBe('observed');
    expect(result.percentile).toBeGreaterThan(0);
    expect(result.percentile).toBeLessThanOrEqual(100);
  });

  it('runBenchmarkEngine handles empty cohort with synthetic disclosure', () => {
    const result = runBenchmarkEngine({
      metric: 'days_to_sell_avg',
      value: 30,
      cohort: [],
    });
    expect(result.cohortSize).toBe(0);
    expect(result.disclosure).toBe('synthetic');
  });
});

describe('feasibility-engine', () => {
  it('runFeasibilityEngine returns base + sensitivity branches', () => {
    const result = runFeasibilityEngine({
      tipo: 'departamentos',
      unitsTotal: 60,
      precioPromedioMxn: 4_500_000,
      costoTotalEstimateMxn: 150_000_000,
      constructionMonths: 18,
      absorcionMensual: 3,
      discountRateAnnual: 12,
      amortizacionTerrenoMensual: 0,
      gastosFijosMensuales: 50_000,
    });
    expect(result.base).toBeDefined();
    expect(result.cashFlow5y.length).toBeGreaterThan(0);
    expect(result.sensitivity.priceUp10).toBeDefined();
    expect(result.sensitivity.priceDown20).toBeDefined();
    expect(['go', 'go_with_caveats', 'no_go']).toContain(result.recommendation);
  });

  it('priceUp10 NPV >= base NPV (precio mayor mejora NPV)', () => {
    const result = runFeasibilityEngine({
      tipo: 'departamentos',
      unitsTotal: 100,
      precioPromedioMxn: 5_000_000,
      costoTotalEstimateMxn: 200_000_000,
      constructionMonths: 24,
      absorcionMensual: 4,
      discountRateAnnual: 12,
      amortizacionTerrenoMensual: 0,
      gastosFijosMensuales: 80_000,
    });
    expect(result.sensitivity.priceUp10.npvMxn).toBeGreaterThanOrEqual(result.base.npvMxn);
    expect(result.sensitivity.priceDown20.npvMxn).toBeLessThanOrEqual(result.base.npvMxn);
  });
});

describe('manzana-analyzer', () => {
  it('runManzanaAnalyzer combines 5 dimensions weighted', () => {
    const result = runManzanaAnalyzer({
      f01Safety: 80,
      f03Ecosystem: 70,
      n01Diversity: 60,
      f10Gentrification: 75,
      f09Value: 65,
    });
    expect(result.scoreTotal).toBeGreaterThan(60);
    expect(result.scoreTotal).toBeLessThanOrEqual(80);
    expect(result.disclosure).toBe('observed');
    expect(result.missing.length).toBe(0);
  });

  it('runManzanaAnalyzer flags synthetic when 3+ dims missing', () => {
    const result = runManzanaAnalyzer({
      f01Safety: 80,
      f03Ecosystem: null,
      n01Diversity: null,
      f10Gentrification: null,
      f09Value: 65,
    });
    expect(result.disclosure).toBe('synthetic');
    expect(result.missing.length).toBe(3);
  });

  it('runManzanaAnalyzer returns recommendation text by tier', () => {
    const high = runManzanaAnalyzer({
      f01Safety: 90,
      f03Ecosystem: 90,
      n01Diversity: 85,
      f10Gentrification: 80,
      f09Value: 85,
    });
    expect(high.recommendation).toMatch(/premium/i);
    const low = runManzanaAnalyzer({
      f01Safety: 20,
      f03Ecosystem: 25,
      n01Diversity: 30,
      f10Gentrification: 35,
      f09Value: 25,
    });
    expect(low.recommendation).toMatch(/no recomendada|alternativas/i);
  });
});
