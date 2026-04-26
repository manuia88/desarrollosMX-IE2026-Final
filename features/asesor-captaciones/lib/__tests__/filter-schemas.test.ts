import { describe, expect, it } from 'vitest';
import { filtersSchema, STATUS_KEYS } from '../filter-schemas';

describe('asesor-captaciones filter-schemas', () => {
  it('applies defaults', () => {
    const f = filtersSchema.parse({});
    expect(f.sort).toBe('byUpdated');
    expect(f.view).toBe('kanban');
  });

  it('parses status filter', () => {
    const f = filtersSchema.parse({ status: 'firmado' });
    expect(f.status).toBe('firmado');
  });

  it('rejects invalid status', () => {
    expect(() => filtersSchema.parse({ status: 'unknown' })).toThrow();
  });

  it('parses uuid drawer', () => {
    const f = filtersSchema.parse({ drawer: '11111111-1111-4111-8111-111111111111' });
    expect(f.drawer).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('rejects malformed drawer uuid', () => {
    expect(() => filtersSchema.parse({ drawer: 'not-uuid' })).toThrow();
  });

  it('STATUS_KEYS canon order', () => {
    expect(STATUS_KEYS).toEqual([
      'prospecto',
      'presentacion',
      'firmado',
      'en_promocion',
      'vendido',
      'cerrado_no_listado',
    ]);
  });
});
