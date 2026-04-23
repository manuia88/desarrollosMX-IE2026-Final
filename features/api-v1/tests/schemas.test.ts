import { describe, expect, it } from 'vitest';
import {
  apiKeyRawSchema,
  apiTierSchema,
  countryCodeSchema,
  indexCodeSchema,
  isoDateSchema,
  isoYearMonthSchema,
  paginationParamsSchema,
  scopeTypeSchema,
} from '../schemas/common';
import { historyQuerySchema } from '../schemas/history';
import { indicesDetailQuerySchema, indicesRankingQuerySchema } from '../schemas/indices';
import { createKeyInputSchema, revokeKeyInputSchema } from '../schemas/keys';

describe('common schemas', () => {
  it('apiTierSchema validates tiers', () => {
    expect(apiTierSchema.parse('free')).toBe('free');
    expect(apiTierSchema.safeParse('ultra').success).toBe(false);
  });

  it('scopeTypeSchema rejects invalid scopes', () => {
    expect(scopeTypeSchema.safeParse('colonia').success).toBe(true);
    expect(scopeTypeSchema.safeParse('pais').success).toBe(false);
  });

  it('indexCodeSchema allows all 15 codes', () => {
    for (const c of [
      'IPV',
      'IAB',
      'IDS',
      'IRE',
      'ICO',
      'MOM',
      'LIV',
      'FAM',
      'YNG',
      'GRN',
      'STR',
      'INV',
      'DEV',
      'GNT',
      'STA',
    ]) {
      expect(indexCodeSchema.safeParse(c).success).toBe(true);
    }
    expect(indexCodeSchema.safeParse('XXX').success).toBe(false);
  });

  it('countryCodeSchema validates codes', () => {
    expect(countryCodeSchema.safeParse('MX').success).toBe(true);
    expect(countryCodeSchema.safeParse('xx').success).toBe(false);
  });

  it('isoYearMonthSchema requires YYYY-MM', () => {
    expect(isoYearMonthSchema.safeParse('2026-03').success).toBe(true);
    expect(isoYearMonthSchema.safeParse('2026-3').success).toBe(false);
  });

  it('isoDateSchema requires YYYY-MM-DD', () => {
    expect(isoDateSchema.safeParse('2026-03-14').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-3-14').success).toBe(false);
  });

  it('paginationParamsSchema applies defaults', () => {
    const r = paginationParamsSchema.parse({});
    expect(r.limit).toBe(100);
    expect(r.cursor).toBeNull();
  });

  it('apiKeyRawSchema accepts dmx_<hex>', () => {
    expect(apiKeyRawSchema.safeParse('dmx_deadbeef12345678').success).toBe(true);
    expect(apiKeyRawSchema.safeParse('api_pro_xyz').success).toBe(false);
  });
});

describe('history schema', () => {
  it('parses minimal valid query', () => {
    const r = historyQuerySchema.parse({
      scope: 'colonia',
      id: 'abc',
      indexCode: 'IPV',
    });
    expect(r.limit).toBe(100);
    expect(r.cursor).toBeNull();
  });

  it('coerces numeric limit from string', () => {
    const r = historyQuerySchema.parse({
      scope: 'colonia',
      id: 'abc',
      indexCode: 'IPV',
      limit: '250',
    });
    expect(r.limit).toBe(250);
  });

  it('rejects invalid from', () => {
    expect(
      historyQuerySchema.safeParse({
        scope: 'colonia',
        id: 'abc',
        indexCode: 'IPV',
        from: '2026',
      }).success,
    ).toBe(false);
  });
});

describe('indices schemas', () => {
  it('indicesRankingQuerySchema defaults', () => {
    const r = indicesRankingQuerySchema.parse({});
    expect(r.scope).toBe('colonia');
    expect(r.country).toBe('MX');
    expect(r.limit).toBe(50);
    expect(r.order).toBe('desc');
  });

  it('indicesDetailQuerySchema optional period', () => {
    const r = indicesDetailQuerySchema.parse({});
    expect(r.period).toBeUndefined();
  });
});

describe('keys schemas', () => {
  it('createKeyInputSchema requires name', () => {
    expect(createKeyInputSchema.safeParse({}).success).toBe(false);
    const r = createKeyInputSchema.parse({ name: 'test' });
    expect(r.scopes).toEqual(['tier:free']);
  });

  it('createKeyInputSchema rejects empty name', () => {
    expect(createKeyInputSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('revokeKeyInputSchema requires uuid', () => {
    expect(revokeKeyInputSchema.safeParse({ api_key_id: 'not-uuid' }).success).toBe(false);
    expect(
      revokeKeyInputSchema.safeParse({ api_key_id: '00000000-0000-4000-8000-000000000000' })
        .success,
    ).toBe(true);
  });
});
