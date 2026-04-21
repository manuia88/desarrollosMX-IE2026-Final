import { describe, expect, it } from 'vitest';
import { estimateCost } from '../lib/cost-calculator';

describe('estimateCost', () => {
  it('computes sonnet-4-6 pricing happy path', () => {
    // 1M input @ $3 + 500k output @ $15 = $3 + $7.5 = $10.5
    const cost = estimateCost({
      model: 'claude-sonnet-4-6',
      inputTokens: 1_000_000,
      outputTokens: 500_000,
    });
    expect(cost).toBeCloseTo(10.5, 4);
  });

  it('falls back to sonnet-4-6 pricing when model is claude-sonnet-4-5', () => {
    const cost45 = estimateCost({
      model: 'claude-sonnet-4-5',
      inputTokens: 100_000,
      outputTokens: 50_000,
    });
    const cost46 = estimateCost({
      model: 'claude-sonnet-4-6',
      inputTokens: 100_000,
      outputTokens: 50_000,
    });
    expect(cost45).toBe(cost46);
    expect(cost45).toBeGreaterThan(0);
  });

  it('returns 0 for unknown model', () => {
    const cost = estimateCost({
      model: 'imaginary-model-42',
      inputTokens: 10_000,
      outputTokens: 5_000,
    });
    expect(cost).toBe(0);
  });

  it('returns 0 when tokens are zero', () => {
    const cost = estimateCost({
      model: 'claude-sonnet-4-6',
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(cost).toBe(0);
  });
});
