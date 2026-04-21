import { describe, expect, it } from 'vitest';
import {
  B_SCORE_KEYS,
  CRITICAL_DEPS,
  computeE01FullProjectScore,
  DEFAULT_E01_WEIGHTS,
  getLabelKey,
  methodology,
  version,
} from '../e01-full-project-score';

describe('E01 Full Project Score', () => {
  it('methodology + weights sum ≈ 1 + CRITICAL_DEPS B01+B04+B08', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_E01_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(CRITICAL_DEPS).toContain('B01');
    expect(CRITICAL_DEPS).toContain('B04');
    expect(CRITICAL_DEPS).toContain('B08');
    expect(methodology.dependencies.length).toBeGreaterThanOrEqual(15);
  });

  it('excelente: todos B* altos + A12 alto → value ≥ 90', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 92;
    const res = computeE01FullProjectScore({ b_scores, a12_score: 95 });
    expect(res.value).toBeGreaterThanOrEqual(90);
    expect(res.confidence).toBe('high');
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.e01.excelente');
    expect(res.components.coverage_pct).toBe(100);
    expect(res.components.score_count).toBe(14);
  });

  it('bueno: B_scores en ~75 → value 70-89', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 75;
    const res = computeE01FullProjectScore({ b_scores, a12_score: 78 });
    expect(res.value).toBeGreaterThanOrEqual(70);
    expect(res.value).toBeLessThan(90);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.e01.bueno');
  });

  it('regular: B_scores en ~55 → value 50-69', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 55;
    const res = computeE01FullProjectScore({ b_scores, a12_score: 60 });
    expect(res.value).toBeGreaterThanOrEqual(50);
    expect(res.value).toBeLessThan(70);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.e01.regular');
  });

  it('pobre: B_scores en ~30 → value < 50', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 30;
    const res = computeE01FullProjectScore({ b_scores, a12_score: 35 });
    expect(res.value).toBeLessThan(50);
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.e01.pobre');
  });

  it('insufficient: B01 missing (critical dep) → confidence insufficient_data', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) {
      if (key !== 'B01') b_scores[key] = 80;
    }
    const res = computeE01FullProjectScore({ b_scores, a12_score: 85 });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.missing_scores).toContain('B01');
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.e01.insufficient');
  });

  it('coverage < 50% → insufficient_data', () => {
    // Solo 3 scores presentes de 15 posibles.
    const res = computeE01FullProjectScore({
      b_scores: { B01: 70, B04: 80, B08: 75 },
      a12_score: null,
    });
    // B01+B04+B08 presentes = 3 de 15, coverage ~20%.
    expect(res.confidence).toBe('insufficient_data');
  });

  it('sensitive fields (internal_margin, financial_raw, dev_cost_breakdown) propagan en components', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 80;
    const res = computeE01FullProjectScore({
      b_scores,
      a12_score: 85,
      internal_margin: 0.28,
      financial_raw: { revenue: 1200000, cost: 850000 },
      dev_cost_breakdown: { land: 40, construction: 45, soft: 15 },
    });
    expect(res.components.internal_margin).toBe(0.28);
    expect(res.components.financial_raw).toEqual({ revenue: 1200000, cost: 850000 });
    expect(res.components.dev_cost_breakdown).toEqual({ land: 40, construction: 45, soft: 15 });
  });

  it('project_weights override aplica y re-normaliza pesos presentes', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 80;
    const res = computeE01FullProjectScore({
      b_scores,
      a12_score: 80,
      project_weights: { B01: 0.25 }, // sobrescribe B01
    });
    expect(res.components.weights_used.B01).toBe(0.25);
    expect(res.value).toBeGreaterThanOrEqual(70);
  });
});
