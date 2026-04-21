import { describe, expect, it } from 'vitest';
import {
  computeD09EcosystemHealth,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  version,
} from '../d09-ecosystem-health';

describe('D09 Ecosystem Health', () => {
  it('declara methodology + weights default suman 1', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(methodology.confidence_thresholds.min_coverage_pct).toBe(50);
  });

  it('cobertura total 4/4 → confidence high + value calculado correcto', () => {
    const res = computeD09EcosystemHealth({
      n01: 80,
      n04: 70,
      n07: 60,
      f08: 90,
    });
    // 80*0.3 + 70*0.2 + 60*0.2 + 90*0.3 = 24 + 14 + 12 + 27 = 77
    expect(res.value).toBe(77);
    expect(res.confidence).toBe('high');
    expect(res.components.coverage_pct).toBe(100);
    expect(res.components.missing_dimensions).toHaveLength(0);
    // weights_applied debe sumar 1
    const wsum = Object.values(res.components.weights_applied).reduce((s, v) => s + v, 0);
    expect(wsum).toBeCloseTo(1, 5);
  });

  it('falta 1 dim (N07) → renormaliza y marca missing + confidence medium', () => {
    const res = computeD09EcosystemHealth({
      n01: 80,
      n04: 70,
      n07: null,
      f08: 90,
    });
    expect(res.confidence).toBe('medium');
    expect(res.components.missing_dimensions).toEqual(['N07']);
    expect(res.components.coverage_pct).toBe(75);
    // Renormalized: N01=0.3/0.8, N04=0.2/0.8, F08=0.3/0.8
    const w = res.components.weights_applied;
    expect(w.N01).toBeCloseTo(0.375, 3);
    expect(w.N04).toBeCloseTo(0.25, 3);
    expect(w.F08).toBeCloseTo(0.375, 3);
    expect(w.N07).toBeUndefined();
    // Weighted sum renormalized: 80*0.375 + 70*0.25 + 90*0.375 = 30 + 17.5 + 33.75 = 81.25 → 81
    expect(res.value).toBe(81);
  });

  it('faltan 2 dims (N04 + N07) coverage=50% → todavía medium (on threshold)', () => {
    const res = computeD09EcosystemHealth({
      n01: 80,
      n04: null,
      n07: null,
      f08: 90,
    });
    expect(res.confidence).toBe('medium');
    expect(res.components.coverage_pct).toBe(50);
    expect([...res.components.missing_dimensions].sort()).toEqual(['N04', 'N07']);
    // N01=0.3/0.6, F08=0.3/0.6 → 80*0.5 + 90*0.5 = 85
    expect(res.value).toBe(85);
  });

  it('insufficient_data cuando coverage <50% (3 de 4 dims missing)', () => {
    const res = computeD09EcosystemHealth({
      n01: 80,
      n04: null,
      n07: null,
      f08: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.coverage_pct).toBe(25);
    expect(res.components.weights_applied).toEqual({});
  });

  it('todos los subscores null → insufficient_data', () => {
    const res = computeD09EcosystemHealth({
      n01: null,
      n04: null,
      n07: null,
      f08: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.coverage_pct).toBe(0);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.d09.excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.d09.bueno');
    expect(getLabelKey(45, 'medium')).toBe('ie.score.d09.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.d09.pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.d09.insufficient');
  });
});
