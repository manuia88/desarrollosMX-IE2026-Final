import { describe, expect, it } from 'vitest';
import { computeLtrStrOpportunity } from '../lib/scores/str-ltr-opportunity';

describe('computeLtrStrOpportunity', () => {
  it('str_strongly_outperforms con samples altos → score cercano a 90', () => {
    const result = computeLtrStrOpportunity({
      regime: 'str_strongly_outperforms',
      str_ltr_ratio: 2.5,
      str_sample_months: 12,
      ltr_sample_listings: 50,
    });
    expect(result.score).toBeGreaterThan(85);
    expect(result.score).toBeLessThanOrEqual(90);
    expect(result.confidence).toBe('high');
  });

  it('ltr_outperforms baja el score al rango 14-20', () => {
    const result = computeLtrStrOpportunity({
      regime: 'ltr_outperforms',
      str_ltr_ratio: 0.6,
      str_sample_months: 12,
      ltr_sample_listings: 50,
    });
    expect(result.score).toBeGreaterThan(14);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it('samples insuficientes → insufficient_data + score 0', () => {
    const result = computeLtrStrOpportunity({
      regime: 'str_outperforms',
      str_ltr_ratio: 1.5,
      str_sample_months: 0,
      ltr_sample_listings: 10,
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.score).toBe(0);
  });

  it('confidence=medium con samples modestos', () => {
    const result = computeLtrStrOpportunity({
      regime: 'parity',
      str_ltr_ratio: 1.0,
      str_sample_months: 6,
      ltr_sample_listings: 20,
    });
    expect(result.confidence).toBe('medium');
    expect(result.regime).toBe('parity');
  });

  it('regime unknown → score 0 sin importar samples', () => {
    const result = computeLtrStrOpportunity({
      regime: 'unknown',
      str_ltr_ratio: null,
      str_sample_months: 12,
      ltr_sample_listings: 50,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe('insufficient_data');
  });
});
