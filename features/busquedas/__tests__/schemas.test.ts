import { describe, expect, it } from 'vitest';
import {
  busquedaCreateInput,
  busquedaListInput,
  busquedaUpdateInput,
  criteriaSchema,
} from '../schemas';

describe('busquedas Zod schemas', () => {
  it('parses minimal create input', () => {
    const parsed = busquedaCreateInput.parse({
      leadId: '11111111-1111-1111-8111-111111111111',
      countryCode: 'MX',
      criteria: { operacion: 'venta' },
    });
    expect(parsed.criteria.operacion).toBe('venta');
    expect(parsed.criteria.amenities).toEqual([]);
  });

  it('rejects bad uuid in create input', () => {
    expect(() =>
      busquedaCreateInput.parse({
        leadId: 'not-uuid',
        countryCode: 'MX',
        criteria: { operacion: 'venta' },
      }),
    ).toThrow();
  });

  it('list input applies defaults', () => {
    const parsed = busquedaListInput.parse({});
    expect(parsed.limit).toBe(60);
  });

  it('update input requires id uuid', () => {
    expect(() => busquedaUpdateInput.parse({ id: 'x', notes: 'foo' })).toThrow();
    const ok = busquedaUpdateInput.parse({
      id: '11111111-1111-1111-8111-111111111111',
      notes: 'hola',
    });
    expect(ok.notes).toBe('hola');
  });

  it('criteria rejects too many zones', () => {
    const tooMany = Array.from({ length: 25 }, () => '11111111-1111-1111-8111-111111111111');
    expect(() => criteriaSchema.parse({ operacion: 'venta', zone_ids: tooMany })).toThrow();
  });
});
