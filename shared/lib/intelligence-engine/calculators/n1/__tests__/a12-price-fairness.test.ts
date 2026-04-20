import { describe, expect, it } from 'vitest';
import type { A12Comparable } from '../a12-price-fairness';
import {
  computeA12PriceFairness,
  getLabelKey,
  MIN_COMPARABLES,
  methodology,
  version,
} from '../a12-price-fairness';

function makeComparables(n: number, basePrice = 35_000): A12Comparable[] {
  return Array.from({ length: n }, (_, i) => ({
    propertyId: `prop-${i}`,
    precio_m2_mxn: basePrice + i * 50,
  }));
}

describe('A12 Price Fairness', () => {
  it('declara methodology + umbrales', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(MIN_COMPARABLES).toBe(10);
    expect(methodology.sources).toContain('unidades');
    expect(methodology.sources).toContain('avm_i01');
  });

  it('founder decision 2026-04-20: gap 25% → score 0 (anómalo)', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_750_000, // +25% AVM
      precio_justo_avm: 3_000_000,
      percentil_zona_p50: 50,
      comparables: makeComparables(15),
    });
    // Fórmula × 4: gap 25% → score = max(0, 100 - 25·4) = 0 (anómalo).
    expect(res.components.gap_pct).toBeCloseTo(25, 0);
    expect(res.value).toBe(0);
    expect(res.components.direction).toBe('overpriced');
  });

  it('gap 12.5% → score 50 (midpoint fórmula × 4)', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_375_000, // +12.5%
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(20),
    });
    expect(res.components.gap_pct).toBeCloseTo(12.5, 1);
    expect(res.value).toBe(50);
    expect(res.components.direction).toBe('overpriced');
  });

  it('overpriced: precio +10% sobre AVM → score 60', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_300_000, // +10%
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(20),
    });
    expect(res.components.direction).toBe('overpriced');
    expect(res.components.gap_pct).toBeCloseTo(10, 0);
    expect(res.value).toBe(60);
  });

  it('fair: precio ±5% del AVM → score ≥80', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_060_000, // +2%
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(30),
    });
    expect(res.components.direction).toBe('fair');
    // gap 2% → score = 100 - 2·4 = 92.
    expect(res.value).toBeGreaterThanOrEqual(90);
  });

  it('underpriced: precio -10% bajo AVM → score 60', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 2_700_000, // -10%
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(15),
    });
    expect(res.components.direction).toBe('underpriced');
    expect(res.components.gap_pct).toBeCloseTo(10, 0);
    expect(res.value).toBe(60);
  });

  it('Tier 2 gating: comparables <10 → insufficient_data + score=0', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_000_000,
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(5),
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.tier_gated).toBe(true);
    expect(res.components.missing_dimensions[0]).toMatch(/comparables_zona/);
  });

  it('Tier 2 activo: comparables =10 → score calculado normal', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_000_000,
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(10),
    });
    expect(res.confidence).toBe('low'); // umbral low = 10
    expect(res.value).toBe(100);
    expect(res.components.tier_gated).toBe(false);
  });

  it('confidence escala con comparables: low / medium / high', () => {
    const lo = computeA12PriceFairness({
      precio_ofertado: 3_000_000,
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(12),
    });
    const md = computeA12PriceFairness({
      precio_ofertado: 3_000_000,
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(20),
    });
    const hi = computeA12PriceFairness({
      precio_ofertado: 3_000_000,
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(40),
    });
    expect(lo.confidence).toBe('low');
    expect(md.confidence).toBe('medium');
    expect(hi.confidence).toBe('high');
  });

  it('gap extremo >100% → score clamped 0', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 10_000_000, // 233% sobre AVM
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(30),
    });
    expect(res.value).toBe(0);
    expect(res.components.gap_pct).toBeGreaterThan(100);
  });

  it('gap mínimo 25% ya satura score en 0 (fórmula × 4)', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_900_000, // +30%
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(30),
    });
    // 30% × 4 = 120 → clamped 0.
    expect(res.value).toBe(0);
  });

  it('precios inválidos → insufficient_data', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 0,
      precio_justo_avm: 0,
      comparables: makeComparables(15),
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('comparables_sample limitado a 10 (no expone lista completa)', () => {
    const res = computeA12PriceFairness({
      precio_ofertado: 3_000_000,
      precio_justo_avm: 3_000_000,
      comparables: makeComparables(50),
    });
    expect(res.components.comparables_count).toBe(50);
    expect(res.components.comparables_sample.length).toBe(10);
  });

  it('getLabelKey A12 mapea umbrales', () => {
    expect(getLabelKey(95, 'high')).toBe('ie.score.a12.precio_justo');
    expect(getLabelKey(80, 'high')).toBe('ie.score.a12.precio_cercano');
    expect(getLabelKey(50, 'high')).toBe('ie.score.a12.precio_desviado');
    expect(getLabelKey(20, 'high')).toBe('ie.score.a12.precio_anomalo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a12.insufficient');
  });
});
