import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkRateLimitMock = vi.fn();

vi.mock('@/shared/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}));

import { enforceRateLimitForTier } from '../lib/rate-limit-tier';

beforeEach(() => {
  checkRateLimitMock.mockReset();
});

describe('enforceRateLimitForTier', () => {
  it('bypasses rate limit entirely for enterprise', async () => {
    const out = await enforceRateLimitForTier({
      tier: 'enterprise',
      apiKeyId: 'k-1',
      ip: '1.2.3.4',
      endpoint: 'v1:test',
    });
    expect(out.allowed).toBe(true);
    expect(out.remaining).toBe(-1);
    expect(out.tier).toBe('enterprise');
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it('uses user:apikey key when apiKeyId present (pro)', async () => {
    checkRateLimitMock.mockResolvedValueOnce({ allowed: true });
    const out = await enforceRateLimitForTier({
      tier: 'pro',
      apiKeyId: 'abc',
      ip: '5.5.5.5',
      endpoint: 'v1:history',
    });
    expect(out.allowed).toBe(true);
    expect(out.tier).toBe('pro');
    expect(out.remaining).toBe(9999); // pro quota 10000 -1
    expect(checkRateLimitMock).toHaveBeenCalledWith('user:apikey:abc', 'v1:history', 86400, 10000);
  });

  it('falls back to ip key when apiKeyId null (free)', async () => {
    checkRateLimitMock.mockResolvedValueOnce({ allowed: true });
    const out = await enforceRateLimitForTier({
      tier: 'free',
      apiKeyId: null,
      ip: '9.9.9.9',
      endpoint: 'v1:indices',
    });
    expect(out.allowed).toBe(true);
    expect(checkRateLimitMock).toHaveBeenCalledWith('ip:9.9.9.9', 'v1:indices', 86400, 100);
  });

  it('returns not-allowed with remaining=0 when rpc denies', async () => {
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false });
    const out = await enforceRateLimitForTier({
      tier: 'starter',
      apiKeyId: 'k',
      ip: '1.1.1.1',
      endpoint: 'v1:history',
    });
    expect(out.allowed).toBe(false);
    expect(out.remaining).toBe(0);
    expect(out.tier).toBe('starter');
  });

  it('uses starter quota of 500', async () => {
    checkRateLimitMock.mockResolvedValueOnce({ allowed: true });
    await enforceRateLimitForTier({
      tier: 'starter',
      apiKeyId: 'k',
      ip: 'x',
      endpoint: 'v1:x',
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith('user:apikey:k', 'v1:x', 86400, 500);
  });
});
