import { describe, expect, it } from 'vitest';
import { filtersSchema } from '../schemas/filter-schemas';

describe('filtersSchema defaults', () => {
  it('applies tab=mine, view=grid, sort=recent by default', () => {
    const parsed = filtersSchema.parse({});
    expect(parsed.tab).toBe('mine');
    expect(parsed.view).toBe('grid');
    expect(parsed.sort).toBe('recent');
  });

  it('rejects invalid status', () => {
    expect(() => filtersSchema.parse({ status: 'cancelado' })).toThrow();
  });

  it('rejects q exceeding 80 chars', () => {
    expect(() => filtersSchema.parse({ q: 'x'.repeat(81) })).toThrow();
  });

  it('rejects countryCode != 2 chars', () => {
    expect(() => filtersSchema.parse({ countryCode: 'MEX' })).toThrow();
  });

  it('accepts drawer uuid', () => {
    const parsed = filtersSchema.parse({ drawer: '00000000-0000-4000-8000-000000000001' });
    expect(parsed.drawer).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('rejects malformed drawer uuid', () => {
    expect(() => filtersSchema.parse({ drawer: 'not-uuid' })).toThrow();
  });
});
