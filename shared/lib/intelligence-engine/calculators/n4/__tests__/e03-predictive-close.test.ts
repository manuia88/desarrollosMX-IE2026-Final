import { describe, expect, it } from 'vitest';
import {
  computeE03PredictiveClose,
  getLabelKey,
  HEURISTIC_WEIGHTS,
  methodology,
  version,
} from '../e03-predictive-close';

describe('E03 Predictive Close', () => {
  it('declara methodology + tier 4 + tenant_scope_required + ml shape', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.tenant_scope_required).toBe(true);
    expect(methodology.heuristic_weights.lead_score).toBe(HEURISTIC_WEIGHTS.lead_score);
    expect(methodology.dependencies[0]?.score_id).toBe('C01');
  });

  it('hot lead (lead alto + visitas + feedback+ + momentum) → prob alta', () => {
    const res = computeE03PredictiveClose({
      lead_score: 90,
      visits_count: 5,
      feedback_positive_ratio: 0.9,
      momentum_zona: 85,
      days_in_funnel: 20,
      price_fit_index: 0.9,
    });
    expect(res.confidence).toBe('high');
    expect(res.components.close_probability).toBeGreaterThan(0.5);
    expect(res.value).toBeGreaterThan(45);
    // Top feature debería ser lead_score por su peso 0.3 con input 0.9.
    expect(res.components.top_features[0]?.feature).toBe('lead_score');
    expect(res.components.top_features[0]?.direction).toBe('positive');
    // Days to close bajo para hot lead.
    expect(res.components.days_to_close_estimate).toBeLessThan(30);
  });

  it('cold lead (lead bajo + pocas visitas) → prob baja, label cold/stalled', () => {
    const res = computeE03PredictiveClose({
      lead_score: 20,
      visits_count: 0,
      feedback_positive_ratio: 0.2,
      momentum_zona: 30,
      days_in_funnel: 15,
      price_fit_index: 0.3,
    });
    expect(res.components.close_probability).toBeLessThan(0.35);
    const label = getLabelKey(res.value, res.confidence);
    expect(['ie.score.e03.cold', 'ie.score.e03.stalled']).toContain(label);
  });

  it('stalled (days_in_funnel > 60) aplica penalty → baja probabilidad', () => {
    const stalled = computeE03PredictiveClose({
      lead_score: 60,
      visits_count: 3,
      feedback_positive_ratio: 0.6,
      momentum_zona: 60,
      days_in_funnel: 90, // >60 penalty
      price_fit_index: 0.7,
    });
    const fresh = computeE03PredictiveClose({
      lead_score: 60,
      visits_count: 3,
      feedback_positive_ratio: 0.6,
      momentum_zona: 60,
      days_in_funnel: 20, // sin penalty
      price_fit_index: 0.7,
    });
    expect(stalled.components.close_probability).toBeLessThan(fresh.components.close_probability);
    // days_in_funnel aparece como negative si está en top features.
    const daysFeat = stalled.components.top_features.find((f) => f.feature === 'days_in_funnel');
    if (daysFeat) expect(daysFeat.direction).toBe('negative');
  });

  it('features insuficientes (<3) → insufficient_data + ml_explanations vacío', () => {
    const res = computeE03PredictiveClose({
      lead_score: 80,
      visits_count: null,
      feedback_positive_ratio: null,
      momentum_zona: null,
      days_in_funnel: null,
      price_fit_index: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.ml_explanations.top_features).toHaveLength(0);
    expect(res.ml_explanations.confidence_interval.low).toBe(0);
    expect(res.ml_explanations.confidence_interval.high).toBe(0);
  });

  it('ml_explanations shape D19: top_features + confidence_interval + model_type', () => {
    const res = computeE03PredictiveClose({
      lead_score: 75,
      visits_count: 4,
      feedback_positive_ratio: 0.7,
      momentum_zona: 70,
      days_in_funnel: 25,
      price_fit_index: 0.8,
    });
    expect(res.ml_explanations.model_type).toBe('heuristic_h1');
    expect(res.ml_explanations.top_features.length).toBeGreaterThan(0);
    expect(res.ml_explanations.top_features.length).toBeLessThanOrEqual(3);
    for (const f of res.ml_explanations.top_features) {
      expect(typeof f.feature).toBe('string');
      expect(typeof f.weight).toBe('number');
      expect(['positive', 'negative']).toContain(f.direction);
      expect(typeof f.contribution).toBe('number');
    }
    // CI encierra probability.
    const prob = res.components.close_probability;
    expect(res.ml_explanations.confidence_interval.low).toBeLessThanOrEqual(prob);
    expect(res.ml_explanations.confidence_interval.high).toBeGreaterThanOrEqual(prob);
    // CI dentro [0,1].
    expect(res.ml_explanations.confidence_interval.low).toBeGreaterThanOrEqual(0);
    expect(res.ml_explanations.confidence_interval.high).toBeLessThanOrEqual(1);
  });

  it('price_fit_index multiplicativo ajusta probability proporcional', () => {
    const base = {
      lead_score: 70,
      visits_count: 3,
      feedback_positive_ratio: 0.7,
      momentum_zona: 60,
      days_in_funnel: 25,
    };
    const high = computeE03PredictiveClose({ ...base, price_fit_index: 1.0 });
    const low = computeE03PredictiveClose({ ...base, price_fit_index: 0.0 });
    expect(high.components.close_probability).toBeGreaterThan(low.components.close_probability);
  });

  it('pii_signals y lead_scores_raw capturan inputs crudos para RLS institucional', () => {
    const res = computeE03PredictiveClose({
      lead_score: 65,
      visits_count: 4,
      feedback_positive_ratio: 0.55,
      momentum_zona: 70,
      days_in_funnel: 30,
      price_fit_index: 0.6,
    });
    expect(res.components.lead_scores_raw.lead_score).toBe(65);
    expect(res.components.lead_scores_raw.momentum_zona).toBe(70);
    expect(res.components.pii_signals.visits_count).toBe(4);
    expect(res.components.pii_signals.days_in_funnel).toBe(30);
    expect(res.components.pii_signals.feedback_positive_ratio).toBe(0.55);
  });

  it('getLabelKey buckets: hot / warm / cold / stalled / insufficient', () => {
    expect(getLabelKey(75, 'high')).toBe('ie.score.e03.hot');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.e03.warm');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.e03.cold');
    expect(getLabelKey(10, 'low')).toBe('ie.score.e03.stalled');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.e03.insufficient');
  });
});
