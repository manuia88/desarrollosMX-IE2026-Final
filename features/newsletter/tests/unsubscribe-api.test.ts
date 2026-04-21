import { beforeAll, describe, expect, it } from 'vitest';
import { hashTokenForDb, mintUnsubscribeToken, verifyToken } from '../lib/tokens';

beforeAll(() => {
  process.env.NEWSLETTER_TOKEN_SECRET = 'test-secret-dmx-hmac-key-stable-0123';
  process.env.CI = 'true';
});

describe('unsubscribe token flow', () => {
  it('hash of minted token equals hashTokenForDb output', () => {
    const token = mintUnsubscribeToken('user@example.com', 'sub-xyz');
    const hash1 = hashTokenForDb(token);
    const hash2 = hashTokenForDb(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different subscribers produce different tokens + hashes', () => {
    const t1 = mintUnsubscribeToken('a@example.com', 'sub-1');
    const t2 = mintUnsubscribeToken('b@example.com', 'sub-2');
    expect(t1).not.toBe(t2);
    expect(hashTokenForDb(t1)).not.toBe(hashTokenForDb(t2));
  });

  it('unsubscribe token does not verify as confirm token', () => {
    const t = mintUnsubscribeToken('a@example.com', 'sub-1');
    expect(verifyToken(t, 'unsubscribe')).not.toBeNull();
    expect(verifyToken(t, 'confirm')).toBeNull();
  });
});
