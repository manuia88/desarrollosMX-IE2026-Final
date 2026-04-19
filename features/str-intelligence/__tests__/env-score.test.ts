import { describe, expect, it } from 'vitest';
import { computeEnvScore, ENV_WEIGHTS, noiseShareFromTopicCounts } from '../lib/scores/env-score';

describe('computeEnvScore', () => {
  it('pesos suman 1', () => {
    expect(ENV_WEIGHTS.aqi + ENV_WEIGHTS.noise).toBeCloseTo(1, 6);
  });

  it('ambos inputs excelentes → score ~ 100', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 0,
      aqi_samples_30d: 30,
      noise_share: 0,
      reviews_analyzed: 500,
    });
    expect(result.score).toBeCloseTo(100, 1);
    expect(result.confidence).toBe('high');
  });

  it('ambos inputs terribles → score ~ 0', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 300,
      aqi_samples_30d: 30,
      noise_share: 0.5,
      reviews_analyzed: 500,
    });
    expect(result.score).toBeCloseTo(0, 1);
    expect(result.confidence).toBe('high');
  });

  it('AQI 100 (moderado) → aqi_component = 60', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 100,
      aqi_samples_30d: 30,
      noise_share: 0,
      reviews_analyzed: 500,
    });
    expect(result.components.aqi).toBeCloseTo(60, 1);
  });

  it('noise_share 10% → noise_component = 60', () => {
    const result = computeEnvScore({
      aqi_avg_30d: null,
      aqi_samples_30d: 0,
      noise_share: 0.1,
      reviews_analyzed: 200,
    });
    expect(result.components.noise).toBeCloseTo(60, 1);
  });

  it('sin inputs → score=0, confidence=insufficient_data', () => {
    const result = computeEnvScore({
      aqi_avg_30d: null,
      aqi_samples_30d: 0,
      noise_share: null,
      reviews_analyzed: 0,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe('insufficient_data');
  });

  it('solo AQI disponible → renormaliza peso a 1.0 AQI', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 50,
      aqi_samples_30d: 20,
      noise_share: null,
      reviews_analyzed: 0,
    });
    expect(result.weights_applied.aqi).toBeCloseTo(1, 6);
    expect(result.weights_applied.noise).toBe(0);
    expect(result.score).toBeCloseTo(result.components.aqi, 2);
  });

  it('confidence=medium cuando aqi_samples o reviews son medios', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 75,
      aqi_samples_30d: 8,
      noise_share: 0.05,
      reviews_analyzed: 60,
    });
    expect(result.confidence).toBe('medium');
  });

  it('confidence=low cuando datos apenas existen', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 120,
      aqi_samples_30d: 2,
      noise_share: null,
      reviews_analyzed: 0,
    });
    expect(result.confidence).toBe('low');
  });

  it('AQI extrapolate: 400 → 0 (clamp)', () => {
    const result = computeEnvScore({
      aqi_avg_30d: 400,
      aqi_samples_30d: 30,
      noise_share: 0,
      reviews_analyzed: 500,
    });
    expect(result.components.aqi).toBe(0);
  });
});

describe('noiseShareFromTopicCounts', () => {
  it('computa ratio correctamente', () => {
    const share = noiseShareFromTopicCounts({ noise: 15, location: 80 }, 100);
    expect(share).toBe(0.15);
  });

  it('topic_counts null → null', () => {
    expect(noiseShareFromTopicCounts(null, 100)).toBeNull();
  });

  it('reviews=0 → null', () => {
    expect(noiseShareFromTopicCounts({ noise: 10 }, 0)).toBeNull();
  });

  it('no noise topic → 0', () => {
    expect(noiseShareFromTopicCounts({ location: 50 }, 100)).toBe(0);
  });
});
