import { describe, expect, it } from 'vitest';
import { resolveRecommendationBucket } from '../score-recommendations-card';

describe('resolveRecommendationBucket', () => {
  it('insufficient_data confidence domina sobre valor', () => {
    expect(resolveRecommendationBucket(95, 'insufficient_data')).toBe('insufficient_data');
    expect(resolveRecommendationBucket(0, 'insufficient_data')).toBe('insufficient_data');
  });

  it('value < 40 → low', () => {
    expect(resolveRecommendationBucket(0, 'high')).toBe('low');
    expect(resolveRecommendationBucket(39, 'high')).toBe('low');
    expect(resolveRecommendationBucket(39.9, 'high')).toBe('low');
  });

  it('value ≥ 40 y < 70 → medium (bordes incluyen 40 y 69)', () => {
    expect(resolveRecommendationBucket(40, 'high')).toBe('medium');
    expect(resolveRecommendationBucket(69, 'high')).toBe('medium');
    expect(resolveRecommendationBucket(55, 'medium')).toBe('medium');
  });

  it('value ≥ 70 → high', () => {
    expect(resolveRecommendationBucket(70, 'high')).toBe('high');
    expect(resolveRecommendationBucket(85, 'medium')).toBe('high');
    expect(resolveRecommendationBucket(100, 'high')).toBe('high');
  });
});
