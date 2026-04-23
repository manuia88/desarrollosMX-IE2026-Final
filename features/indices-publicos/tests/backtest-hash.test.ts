import { describe, expect, it } from 'vitest';
import {
  type BacktestHashInput,
  backtestHashSchema,
  decodeBacktestHash,
  encodeBacktestHash,
} from '../lib/backtest-hash';

describe('backtest-hash — encode/decode roundtrip', () => {
  it('roundtrips a realistic 1-scope input', () => {
    const input: BacktestHashInput = {
      indexCode: 'IPV',
      scopeType: 'colonia',
      countryCode: 'MX',
      from: '2024-01-01',
      to: '2026-01-01',
      scopeIds: ['roma-norte'],
    };
    const hash = encodeBacktestHash(input);
    const decoded = decodeBacktestHash(hash);
    expect(decoded).toEqual(input);
  });

  it('roundtrips a 4-scope colonia input within URL length budget', () => {
    const input: BacktestHashInput = {
      indexCode: 'IRE',
      scopeType: 'colonia',
      countryCode: 'MX',
      from: '2020-01-01',
      to: '2026-01-01',
      scopeIds: ['roma-norte', 'condesa', 'polanco', 'del-valle-centro'],
    };
    const hash = encodeBacktestHash(input);
    const decoded = decodeBacktestHash(hash);
    expect(decoded).toEqual(input);

    // Hash-only budget: <200 chars so that `${origin}/${locale}/indices/backtest?h=<hash>`
    // with realistic origin (~26) + locale (~5) + path (~22) stays under ~260 total.
    expect(hash.length).toBeLessThan(200);
  });

  it('includes optional topN when provided', () => {
    const input: BacktestHashInput = {
      indexCode: 'MOM',
      scopeType: 'city',
      countryCode: 'MX',
      from: '2024-01-01',
      to: '2025-06-01',
      scopeIds: ['CDMX'],
      topN: 25,
    };
    const hash = encodeBacktestHash(input);
    const decoded = decodeBacktestHash(hash);
    expect(decoded?.topN).toBe(25);
  });
});

describe('backtest-hash — decode invalid inputs', () => {
  it('returns null on empty string', () => {
    expect(decodeBacktestHash('')).toBeNull();
  });

  it('returns null on non-base64url chars', () => {
    expect(decodeBacktestHash('not valid!!')).toBeNull();
  });

  it('returns null on valid base64url but invalid JSON', () => {
    const notJson = Buffer.from('not-json-at-all', 'utf8').toString('base64url');
    expect(decodeBacktestHash(notJson)).toBeNull();
  });

  it('returns null when JSON is valid but schema rejects malformed date', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'IPV',
        s: 'colonia',
        c: 'MX',
        f: '2024/01/01',
        t: '2026-01-01',
        x: ['roma-norte'],
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });

  it('returns null when index code is not in registry', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'ZZZ',
        s: 'colonia',
        c: 'MX',
        f: '2024-01-01',
        t: '2026-01-01',
        x: ['roma-norte'],
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });

  it('returns null when scopeIds is empty', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'IPV',
        s: 'colonia',
        c: 'MX',
        f: '2024-01-01',
        t: '2026-01-01',
        x: [],
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });

  it('returns null when scopeIds exceeds 4', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'IPV',
        s: 'colonia',
        c: 'MX',
        f: '2024-01-01',
        t: '2026-01-01',
        x: ['a', 'b', 'c', 'd', 'e'],
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });

  it('returns null when from >= to', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'IPV',
        s: 'colonia',
        c: 'MX',
        f: '2026-01-01',
        t: '2024-01-01',
        x: ['roma-norte'],
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });

  it('returns null when scopeId contains disallowed chars', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'IPV',
        s: 'colonia',
        c: 'MX',
        f: '2024-01-01',
        t: '2026-01-01',
        x: ['roma norte con espacios'],
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });

  it('rejects unknown extra keys in payload (strict schema)', () => {
    const bad = Buffer.from(
      JSON.stringify({
        i: 'IPV',
        s: 'colonia',
        c: 'MX',
        f: '2024-01-01',
        t: '2026-01-01',
        x: ['roma-norte'],
        extra: 'should-be-rejected',
      }),
      'utf8',
    ).toString('base64url');
    expect(decodeBacktestHash(bad)).toBeNull();
  });
});

describe('backtestHashSchema — direct validation', () => {
  it('parses a minimal valid payload', () => {
    const result = backtestHashSchema.safeParse({
      i: 'IPV',
      s: 'colonia',
      c: 'MX',
      f: '2024-01-01',
      t: '2026-01-01',
      x: ['roma-norte'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects scopeId longer than 120 chars', () => {
    const longId = 'a'.repeat(121);
    const result = backtestHashSchema.safeParse({
      i: 'IPV',
      s: 'colonia',
      c: 'MX',
      f: '2024-01-01',
      t: '2026-01-01',
      x: [longId],
    });
    expect(result.success).toBe(false);
  });

  it('accepts scopeId with allowed chars (a-zA-Z0-9_-:)', () => {
    const result = backtestHashSchema.safeParse({
      i: 'STR',
      s: 'alcaldia',
      c: 'CO',
      f: '2023-06-01',
      t: '2025-06-01',
      x: ['MX:CDMX:colonia-x_123-abc'],
    });
    expect(result.success).toBe(true);
  });
});

describe('encodeBacktestHash — URL length budget', () => {
  it('produces base64url only (no +, /, or = chars)', () => {
    const hash = encodeBacktestHash({
      indexCode: 'IPV',
      scopeType: 'colonia',
      countryCode: 'MX',
      from: '2024-01-01',
      to: '2026-01-01',
      scopeIds: ['roma-norte', 'condesa', 'polanco', 'del-valle-centro'],
    });
    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hash.includes('=')).toBe(false);
    expect(hash.includes('+')).toBe(false);
    expect(hash.includes('/')).toBe(false);
  });
});
