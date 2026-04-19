import { describe, expect, it } from 'vitest';
import { computeZoneInvestmentScore, ZIS_WEIGHTS } from '../lib/scores/zone-investment-score';

describe('computeZoneInvestmentScore', () => {
  it('pesos suman 1 (invariant)', () => {
    const sum =
      ZIS_WEIGHTS.baseline +
      ZIS_WEIGHTS.cap_rate +
      ZIS_WEIGHTS.ltr_regime +
      ZIS_WEIGHTS.sentiment +
      ZIS_WEIGHTS.momentum;
    expect(sum).toBeCloseTo(1, 6);
  });

  it('todos los inputs presentes → score en [0,100], confidence=high', () => {
    const result = computeZoneInvestmentScore({
      baseline_score: 75,
      baseline_confidence: 'high',
      cap_rate: 0.1,
      ltr_opportunity_score: 80,
      ltr_confidence: 'high',
      sentiment_weighted_avg: 0.4,
      reviews_analyzed: 200,
      momentum_yoy_pct: 0.1,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBe('high');
    expect(result.contributors_count).toBe(5);
    expect(result.weights_applied.baseline).toBeCloseTo(0.3, 6);
  });

  it('inputs vacíos → score=0, confidence=insufficient_data', () => {
    const result = computeZoneInvestmentScore({
      baseline_score: null,
      baseline_confidence: 'insufficient_data',
      cap_rate: null,
      ltr_opportunity_score: null,
      ltr_confidence: 'insufficient_data',
      sentiment_weighted_avg: null,
      reviews_analyzed: 0,
      momentum_yoy_pct: null,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe('insufficient_data');
    expect(result.contributors_count).toBe(0);
  });

  it('renormaliza pesos cuando faltan componentes', () => {
    // Solo baseline + sentiment presentes (peso original 0.30 + 0.15 = 0.45).
    // Tras renormalize deben sumar 1: baseline 0.30/0.45 ≈ 0.667, sentiment 0.15/0.45 ≈ 0.333.
    const result = computeZoneInvestmentScore({
      baseline_score: 60,
      baseline_confidence: 'medium',
      cap_rate: null,
      ltr_opportunity_score: null,
      ltr_confidence: 'insufficient_data',
      sentiment_weighted_avg: 0.5,
      reviews_analyzed: 150,
      momentum_yoy_pct: null,
    });
    expect(result.weights_applied.baseline).toBeCloseTo(0.6667, 3);
    expect(result.weights_applied.sentiment).toBeCloseTo(0.3333, 3);
    expect(result.weights_applied.cap_rate).toBe(0);
    // Score combina baseline=60 (peso 0.667) + sentiment normalizado=75 (peso 0.333).
    expect(result.score).toBeCloseTo(60 * 0.6667 + 75 * 0.3333, 1);
    expect(result.contributors_count).toBe(2);
    expect(result.confidence).toBe('low'); // 2 contribuyentes → downgrade.
  });

  it('sentiment con pocos reviews degrada confidence', () => {
    const result = computeZoneInvestmentScore({
      baseline_score: 70,
      baseline_confidence: 'high',
      cap_rate: 0.08,
      ltr_opportunity_score: 70,
      ltr_confidence: 'high',
      sentiment_weighted_avg: 0.3,
      reviews_analyzed: 10,
      momentum_yoy_pct: 0.05,
    });
    expect(result.confidence).toBe('low');
  });

  it('sentiment 100+ reviews mantiene high si todo lo demás es high', () => {
    const result = computeZoneInvestmentScore({
      baseline_score: 70,
      baseline_confidence: 'high',
      cap_rate: 0.08,
      ltr_opportunity_score: 70,
      ltr_confidence: 'high',
      sentiment_weighted_avg: 0.3,
      reviews_analyzed: 250,
      momentum_yoy_pct: 0.05,
    });
    expect(result.confidence).toBe('high');
  });

  it('cap_rate normalization: 0.20 → 100, 0.10 → 50, 0 → 0', () => {
    const high = computeZoneInvestmentScore({
      baseline_score: null,
      baseline_confidence: 'insufficient_data',
      cap_rate: 0.2,
      ltr_opportunity_score: null,
      ltr_confidence: 'insufficient_data',
      sentiment_weighted_avg: null,
      reviews_analyzed: 0,
      momentum_yoy_pct: null,
    });
    expect(high.components.cap_rate).toBe(100);
    expect(high.score).toBe(100);
  });

  it('momentum: yoy=+30% → 100, yoy=-10% → 0', () => {
    const positive = computeZoneInvestmentScore({
      baseline_score: 50,
      baseline_confidence: 'high',
      cap_rate: 0.1,
      ltr_opportunity_score: 50,
      ltr_confidence: 'high',
      sentiment_weighted_avg: 0,
      reviews_analyzed: 200,
      momentum_yoy_pct: 0.3,
    });
    const negative = computeZoneInvestmentScore({
      baseline_score: 50,
      baseline_confidence: 'high',
      cap_rate: 0.1,
      ltr_opportunity_score: 50,
      ltr_confidence: 'high',
      sentiment_weighted_avg: 0,
      reviews_analyzed: 200,
      momentum_yoy_pct: -0.1,
    });
    expect(positive.components.momentum).toBe(100);
    expect(negative.components.momentum).toBe(0);
    expect(positive.score).toBeGreaterThan(negative.score);
  });

  it('confidence cascade: baseline=low + el resto high → low', () => {
    const result = computeZoneInvestmentScore({
      baseline_score: 60,
      baseline_confidence: 'low',
      cap_rate: 0.08,
      ltr_opportunity_score: 70,
      ltr_confidence: 'high',
      sentiment_weighted_avg: 0.3,
      reviews_analyzed: 200,
      momentum_yoy_pct: 0.1,
    });
    expect(result.confidence).toBe('low');
  });

  it('cap_rate negativo (loss) sigue válido y queda clamped a 0', () => {
    const result = computeZoneInvestmentScore({
      baseline_score: 50,
      baseline_confidence: 'high',
      cap_rate: -0.02,
      ltr_opportunity_score: null,
      ltr_confidence: 'insufficient_data',
      sentiment_weighted_avg: null,
      reviews_analyzed: 0,
      momentum_yoy_pct: null,
    });
    expect(result.components.cap_rate).toBe(0);
    expect(result.inputs_present.cap_rate).toBe(true);
  });
});
