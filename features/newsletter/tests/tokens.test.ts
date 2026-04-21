import { beforeAll, describe, expect, it } from 'vitest';
import { hashTokenForDb, mintConfirmToken, mintUnsubscribeToken, verifyToken } from '../lib/tokens';

beforeAll(() => {
  process.env.NEWSLETTER_TOKEN_SECRET = 'test-secret-dmx-hmac-key-stable-0123';
});

describe('newsletter tokens', () => {
  it('mint+verify confirm roundtrip', () => {
    const t = mintConfirmToken('alice@example.com', 'sub-001');
    const v = verifyToken(t, 'confirm');
    expect(v).not.toBeNull();
    expect(v?.email).toBe('alice@example.com');
    expect(v?.subscriberId).toBe('sub-001');
    expect(v?.kind).toBe('confirm');
  });

  it('mint+verify unsubscribe roundtrip', () => {
    const t = mintUnsubscribeToken('bob@example.com', 'sub-002');
    const v = verifyToken(t, 'unsubscribe');
    expect(v).not.toBeNull();
    expect(v?.email).toBe('bob@example.com');
    expect(v?.subscriberId).toBe('sub-002');
    expect(v?.kind).toBe('unsubscribe');
  });

  it('rejects wrong kind (confirm token as unsubscribe)', () => {
    const t = mintConfirmToken('alice@example.com', 'sub-001');
    const v = verifyToken(t, 'unsubscribe');
    expect(v).toBeNull();
  });

  it('rejects tampered signature', () => {
    const t = mintConfirmToken('alice@example.com', 'sub-001');
    const [payload] = t.split('.');
    const tampered = `${payload}.deadbeefAAAAAAAAAAAAAAAAAAAA`;
    const v = verifyToken(tampered, 'confirm');
    expect(v).toBeNull();
  });

  it('rejects malformed token', () => {
    expect(verifyToken('', 'confirm')).toBeNull();
    expect(verifyToken('no-dot', 'confirm')).toBeNull();
    expect(verifyToken('one.two.three', 'confirm')).toBeNull();
  });

  it('hashTokenForDb is deterministic + hex', () => {
    const t = mintConfirmToken('a@b.com', 'id');
    const h1 = hashTokenForDb(t);
    const h2 = hashTokenForDb(t);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different tokens produce different hashes', () => {
    const t1 = mintConfirmToken('a@b.com', 'id1');
    const t2 = mintConfirmToken('a@b.com', 'id2');
    expect(hashTokenForDb(t1)).not.toBe(hashTokenForDb(t2));
  });
});
