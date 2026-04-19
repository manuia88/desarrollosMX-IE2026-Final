import { describe, expect, it } from 'vitest';
import { computeSuperHostScore, SUPER_HOST_WEIGHTS } from '../lib/scores/super-host-score';

describe('computeSuperHostScore', () => {
  it('pesos suman 1', () => {
    const sum =
      SUPER_HOST_WEIGHTS.occupancy +
      SUPER_HOST_WEIGHTS.rating +
      SUPER_HOST_WEIGHTS.reviews_count +
      SUPER_HOST_WEIGHTS.portfolio +
      SUPER_HOST_WEIGHTS.retention;
    expect(sum).toBeCloseTo(1, 6);
  });

  it('host perfect → tier=diamond (score ≥85)', () => {
    const result = computeSuperHostScore({
      avg_occupancy_rate: 0.9,
      avg_rating: 4.95,
      avg_reviews_count: 180,
      listings_count: 25,
      retention_12m_rate: 0.98,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe('diamond');
    expect(result.churn_risk).toBe(0);
  });

  it('host medio → tier=silver', () => {
    const result = computeSuperHostScore({
      avg_occupancy_rate: 0.55,
      avg_rating: 4.5,
      avg_reviews_count: 40,
      listings_count: 5,
      retention_12m_rate: 0.8,
    });
    expect(result.tier).toBe('silver');
  });

  it('host con drop de listings 30% → churn_risk alto', () => {
    const result = computeSuperHostScore({
      avg_occupancy_rate: 0.6,
      avg_rating: 4.6,
      avg_reviews_count: 60,
      listings_count: 7,
      retention_12m_rate: 0.7,
      listings_count_prev_30d: 10,
    });
    expect(result.churn_risk).toBeGreaterThan(0.2);
  });

  it('host sin señales → churn_risk=0 + tier bronze cuando score bajo', () => {
    const result = computeSuperHostScore({
      avg_occupancy_rate: 0.2,
      avg_rating: 3.0,
      avg_reviews_count: 5,
      listings_count: 1,
      retention_12m_rate: 0.3,
    });
    expect(result.tier).toBe('bronze');
    expect(result.churn_risk).toBe(0);
  });

  it('portfolio bump: 20+ listings saturan el componente a 100', () => {
    const small = computeSuperHostScore({
      avg_occupancy_rate: 0.6,
      avg_rating: 4.5,
      avg_reviews_count: 50,
      listings_count: 3,
      retention_12m_rate: 0.8,
    });
    const large = computeSuperHostScore({
      avg_occupancy_rate: 0.6,
      avg_rating: 4.5,
      avg_reviews_count: 50,
      listings_count: 30,
      retention_12m_rate: 0.8,
    });
    expect(large.components.portfolio).toBeGreaterThan(small.components.portfolio);
    expect(large.score).toBeGreaterThan(small.score);
  });
});
