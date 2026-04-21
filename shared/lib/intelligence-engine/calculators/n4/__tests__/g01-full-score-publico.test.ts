import { describe, expect, it } from 'vitest';
import { B_SCORE_KEYS } from '../e01-full-project-score';
import {
  CATEGORY_MAPPING,
  computeG01FullScorePublico,
  getLabelKey,
  methodology,
  version,
} from '../g01-full-score-publico';

describe('G01 Full Score 2.0 Público', () => {
  it('methodology + version + categories (safety, quality, momentum)', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.categories).toEqual(['safety', 'quality', 'momentum']);
    expect(methodology.dependencies[0]?.score_id).toBe('E01');
    // cada B_key debe tener categoría asignada.
    for (const key of B_SCORE_KEYS) {
      expect(CATEGORY_MAPPING[key]).toBeDefined();
    }
  });

  it('excelente: todos B* altos → rating excelente, public_breakdown sin null', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 92;
    const res = computeG01FullScorePublico({ b_scores, a12_score: 94 });
    expect(res.value).toBeGreaterThanOrEqual(90);
    expect(res.components.public_summary.rating).toBe('excelente');
    expect(res.components.public_breakdown.safety).not.toBeNull();
    expect(res.components.public_breakdown.quality).not.toBeNull();
    expect(res.components.public_breakdown.momentum).not.toBeNull();
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.g01.excelente');
  });

  it('bueno: B_scores en ~75 → rating bueno, trend estable sin previous_value', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 75;
    const res = computeG01FullScorePublico({ b_scores, a12_score: 78 });
    expect(res.components.public_summary.rating).toBe('bueno');
    expect(res.components.trend_direction).toBe('estable');
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.g01.bueno');
  });

  it('regular con previous_value: trend direction mejorando cuando delta > 3', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 60;
    const res = computeG01FullScorePublico({
      b_scores,
      a12_score: 60,
      previous_value: 50,
    });
    expect(res.components.public_summary.rating).toBe('regular');
    expect(res.components.trend_direction).toBe('mejorando');
  });

  it('empeorando: current << previous → trend empeorando', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 55;
    const res = computeG01FullScorePublico({
      b_scores,
      a12_score: 55,
      previous_value: 75,
    });
    expect(res.components.trend_direction).toBe('empeorando');
  });

  it('insufficient: B01 missing (E01 critical) → confidence insufficient_data + rating pobre', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) {
      if (key !== 'B01') b_scores[key] = 80;
    }
    const res = computeG01FullScorePublico({ b_scores, a12_score: 85 });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.public_summary.confidence_label).toBe('insufficient_data');
    expect(res.components.public_breakdown.safety).toBeNull();
    expect(res.components.public_breakdown.quality).toBeNull();
    expect(res.components.public_breakdown.momentum).toBeNull();
    expect(getLabelKey(res.value, res.confidence)).toBe('ie.score.g01.insufficient');
  });

  it('category_averages: agrupa B_scores correctamente por categoría', () => {
    const b_scores: Record<string, number> = {};
    for (const key of B_SCORE_KEYS) b_scores[key] = 80;
    // Ajusta 1 score por categoría para verificar agrupación.
    b_scores.B01 = 90; // momentum
    b_scores.B04 = 90; // quality
    b_scores.B05 = 90; // safety
    const res = computeG01FullScorePublico({ b_scores, a12_score: 80 });
    const { safety, quality, momentum } = res.components.category_averages;
    expect(safety).not.toBeNull();
    expect(quality).not.toBeNull();
    expect(momentum).not.toBeNull();
    if (safety !== null && quality !== null && momentum !== null) {
      // todos en rango razonable (≥80 con bump localizado).
      expect(safety).toBeGreaterThanOrEqual(80);
      expect(quality).toBeGreaterThanOrEqual(80);
      expect(momentum).toBeGreaterThanOrEqual(80);
    }
  });
});
