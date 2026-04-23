import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: rpcMock,
    from: fromMock,
  }),
}));

import { deriveTierFromScopes, extractApiKey, verifyApiKey } from '../lib/auth';

function makeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/v1/test', { headers });
}

beforeEach(() => {
  rpcMock.mockReset();
  selectMock.mockReset();
  fromMock.mockReset();
  fromMock.mockImplementation(() => ({
    select: selectMock,
  }));
});

describe('extractApiKey', () => {
  it('returns the x-dmx-api-key header when present', () => {
    const req = makeRequest({ 'x-dmx-api-key': 'dmx_abc123' });
    expect(extractApiKey(req)).toBe('dmx_abc123');
  });

  it('returns the Authorization Bearer token', () => {
    const req = makeRequest({ authorization: 'Bearer dmx_xyz' });
    expect(extractApiKey(req)).toBe('dmx_xyz');
  });

  it('returns null when no header present', () => {
    const req = makeRequest({});
    expect(extractApiKey(req)).toBeNull();
  });

  it('trims whitespace from the direct header', () => {
    const req = makeRequest({ 'x-dmx-api-key': '  dmx_trimmed  ' });
    expect(extractApiKey(req)).toBe('dmx_trimmed');
  });

  it('prefers x-dmx-api-key over Authorization when both present', () => {
    const req = makeRequest({
      'x-dmx-api-key': 'dmx_direct',
      authorization: 'Bearer dmx_auth',
    });
    expect(extractApiKey(req)).toBe('dmx_direct');
  });
});

describe('deriveTierFromScopes', () => {
  it('returns free when scopes null or empty', () => {
    expect(deriveTierFromScopes(null)).toBe('free');
    expect(deriveTierFromScopes(undefined)).toBe('free');
    expect(deriveTierFromScopes([])).toBe('free');
  });

  it('returns the tier derived from a tier:<name> scope', () => {
    expect(deriveTierFromScopes(['tier:pro'])).toBe('pro');
    expect(deriveTierFromScopes(['read', 'tier:starter'])).toBe('starter');
    expect(deriveTierFromScopes(['tier:enterprise', 'tier:pro'])).toBe('enterprise');
  });

  it('falls back to free on unknown tier', () => {
    expect(deriveTierFromScopes(['tier:ultra'])).toBe('free');
  });

  it('ignores non-string entries', () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentional malformed input coverage
    expect(deriveTierFromScopes([123 as any, 'tier:pro'])).toBe('pro');
  });
});

describe('verifyApiKey', () => {
  it('returns null when rawKey is empty or too short', async () => {
    expect(await verifyApiKey(null)).toBeNull();
    expect(await verifyApiKey('')).toBeNull();
    expect(await verifyApiKey('short')).toBeNull();
  });

  it('returns null when RPC verify_api_key returns null', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    expect(await verifyApiKey('dmx_validlength_xxxxxxx')).toBeNull();
  });

  it('returns a VerifiedApiKey with derived tier on success', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'api-key-id-1', error: null });
    selectMock.mockImplementationOnce(() => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: {
            id: 'api-key-id-1',
            profile_id: 'profile-1',
            scopes: ['read', 'tier:pro'],
          },
          error: null,
        }),
      }),
    }));

    const result = await verifyApiKey('dmx_goodkey_xxxx');
    expect(result).toEqual({
      apiKeyId: 'api-key-id-1',
      profileId: 'profile-1',
      tier: 'pro',
      scopes: ['read', 'tier:pro'],
    });
  });

  it('returns null when row fetch fails', async () => {
    rpcMock.mockResolvedValueOnce({ data: 'api-key-id-2', error: null });
    selectMock.mockImplementationOnce(() => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: { message: 'not found' } }),
      }),
    }));

    expect(await verifyApiKey('dmx_missing_keyxxxx')).toBeNull();
  });
});
