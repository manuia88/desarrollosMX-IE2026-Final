import { describe, expect, it } from 'vitest';
import { useSpatialSearch } from '../use-spatial-search';

describe('useSpatialSearch (signature)', () => {
  it('exports a function', () => {
    expect(typeof useSpatialSearch).toBe('function');
  });
});
