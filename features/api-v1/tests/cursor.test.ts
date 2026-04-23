import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../lib/cursor';

describe('cursor encoding', () => {
  it('roundtrips a simple payload', () => {
    const encoded = encodeCursor({ period_date: '2026-01-01', id: 'abc-123' });
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual({ period_date: '2026-01-01', id: 'abc-123' });
  });

  it('returns null for empty/malformed input', () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor('not-base64-at-all-!!!$$')).toBeNull();
  });

  it('returns null when JSON is valid but shape is wrong', () => {
    const badPayload = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeCursor(badPayload)).toBeNull();
  });

  it('uses url-safe base64 (no + or /)', () => {
    const encoded = encodeCursor({
      period_date: '2026-01-01',
      id: 'aaa+bbb/ccc',
    });
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });
});
