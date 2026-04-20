import { describe, expect, it } from 'vitest';
import { resolveConfidenceTone } from '../confidence-badge';

describe('resolveConfidenceTone', () => {
  it('retorna null para high (renderiza invisible)', () => {
    expect(resolveConfidenceTone('high')).toBeNull();
  });

  it('mapea medium → warm', () => {
    expect(resolveConfidenceTone('medium')).toBe('warm');
  });

  it('mapea low → sunset', () => {
    expect(resolveConfidenceTone('low')).toBe('sunset');
  });

  it('mapea insufficient_data → cool', () => {
    expect(resolveConfidenceTone('insufficient_data')).toBe('cool');
  });
});
