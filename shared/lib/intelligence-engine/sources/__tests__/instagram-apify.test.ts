// Tests for instagram-apify.ts — BLOQUE 11.H Trend Genome sub-agent A (11.H.1).

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FetchInstagramParams } from '../instagram-apify';
import { fetchInstagramPublicGeotags, hashHandle } from '../instagram-apify';

const PERIOD = '2026-04-01';
const COUNTRY = 'MX';

function baseParams(overrides: Partial<FetchInstagramParams> = {}): FetchInstagramParams {
  return {
    zoneId: 'zone-roma-norte',
    scopeType: 'colonia',
    countryCode: COUNTRY,
    period: PERIOD,
    supabase: {} as SupabaseClient,
    ...overrides,
  };
}

function mockJsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('hashHandle', () => {
  it('produces 64-char hex sha256 for handle + salt', () => {
    const h = hashHandle('some_chef', `${COUNTRY}:${PERIOD}`);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    // Determinism: re-hash same inputs → same output.
    expect(hashHandle('some_chef', `${COUNTRY}:${PERIOD}`)).toBe(h);
    // Salt changes output.
    expect(hashHandle('some_chef', 'CO:2026-01-01')).not.toBe(h);
  });
});

describe('fetchInstagramPublicGeotags', () => {
  it('APIFY_TOKEN missing → zeros + limitation APIFY_TOKEN_MISSING + confidence 0', async () => {
    vi.stubEnv('APIFY_TOKEN', '');
    const mockFetch = vi.fn() as unknown as typeof fetch;
    const res = await fetchInstagramPublicGeotags(
      baseParams({ fetchImpl: mockFetch, apifyToken: '' }),
    );
    expect(res.chef_count).toBe(0);
    expect(res.gallery_count).toBe(0);
    expect(res.creator_count).toBe(0);
    expect(res.specialty_cafe_count).toBe(0);
    expect(res.raw_handles_hashed).toEqual([]);
    expect(res.source_confidence).toBe(0);
    expect(res.limitation).toBe('APIFY_TOKEN_MISSING');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('happy path: 3 chefs + 1 gallery + 2 creators + 1 specialty cafe', async () => {
    vi.stubEnv('APIFY_TOKEN', 'test-token');

    // Instagram posts: each with a public locationId. Classification priority:
    // chef > gallery > creator. Specialty cafe is an additive dimension
    // (caption/venue match).
    const payload = [
      {
        ownerUsername: 'chef_alpha',
        ownerVerified: true,
        ownerFollowerCount: 12000,
        ownerBio: 'Head chef at Bistro A',
        caption: 'new menu',
        locationId: 'loc-1',
        locationName: 'Bistro A',
      },
      {
        ownerUsername: 'chef_bravo',
        ownerVerified: true,
        ownerFollowerCount: 8000,
        ownerBio: 'Restaurant owner',
        caption: 'chef life',
        locationId: 'loc-2',
        locationName: 'Bistro B',
      },
      {
        ownerUsername: 'chef_charlie',
        ownerVerified: true,
        ownerFollowerCount: 4000,
        ownerBio: 'Kitchen stories',
        caption: 'today',
        locationId: 'loc-3',
        locationName: 'Cocina C',
      },
      {
        ownerUsername: 'gallery_x',
        ownerVerified: true,
        ownerFollowerCount: 6000,
        ownerBio: 'Contemporary gallery & curator',
        caption: 'new exhibit',
        locationId: 'loc-4',
        locationName: 'Galeria X',
      },
      {
        ownerUsername: 'creator_p',
        ownerVerified: true,
        ownerFollowerCount: 9000,
        ownerBio: 'Content creator',
        caption: 'fashion',
        locationId: 'loc-5',
        locationName: 'Zone spot',
      },
      {
        ownerUsername: 'creator_q',
        ownerVerified: true,
        ownerFollowerCount: 15000,
        ownerBio: 'Lifestyle',
        caption: 'cool',
        locationId: 'loc-6',
        locationName: 'Another spot',
      },
      {
        ownerUsername: 'cafe_spec',
        ownerVerified: true,
        ownerFollowerCount: 7000,
        ownerBio: 'Coffee shop owner',
        caption: 'specialty coffee brewing today',
        locationId: 'loc-7',
        locationName: 'Roasters Lab',
      },
    ];

    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockJsonResponse(payload)) as unknown as typeof fetch;
    const res = await fetchInstagramPublicGeotags(baseParams({ fetchImpl: mockFetch }));

    expect(res.chef_count).toBe(3);
    expect(res.gallery_count).toBe(1);
    // cafe_spec has "coffee shop" in bio → contains "shop"? no. But "coffee"
    // not in CHEF_KEYWORDS. It has followers >= 5000 and is not chef/gallery →
    // classified as creator. Plus creator_p + creator_q = 3 creators total.
    expect(res.creator_count).toBe(3);
    expect(res.specialty_cafe_count).toBe(1);
    expect(res.raw_handles_hashed.length).toBe(7);
    // All hashes 64-char hex
    for (const h of res.raw_handles_hashed) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(res.source_confidence).toBeGreaterThan(0);
    expect(res.limitation).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('non-verified accounts are excluded', async () => {
    vi.stubEnv('APIFY_TOKEN', 'test-token');

    const payload = [
      {
        ownerUsername: 'unverified_chef',
        ownerVerified: false,
        ownerFollowerCount: 50000,
        ownerBio: 'chef at some place',
        caption: 'restaurant life',
        locationId: 'loc-1',
        locationName: 'Place',
      },
      {
        ownerUsername: 'verified_chef',
        ownerVerified: true,
        ownerFollowerCount: 3000,
        ownerBio: 'chef tasting menu',
        caption: 'kitchen',
        locationId: 'loc-2',
        locationName: 'Place2',
      },
    ];

    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockJsonResponse(payload)) as unknown as typeof fetch;
    const res = await fetchInstagramPublicGeotags(baseParams({ fetchImpl: mockFetch }));

    expect(res.chef_count).toBe(1);
    expect(res.creator_count).toBe(0);
    expect(res.gallery_count).toBe(0);
    expect(res.limitation).toBeNull();
  });

  it('handles are hashed: hash !== plaintext, is 64-char sha256 hex', async () => {
    vi.stubEnv('APIFY_TOKEN', 'test-token');

    const plainHandle = 'chef_alpha_secret';
    const payload = [
      {
        ownerUsername: plainHandle,
        ownerVerified: true,
        ownerFollowerCount: 10000,
        ownerBio: 'chef table',
        caption: 'restaurant',
        locationId: 'loc-1',
        locationName: 'Venue',
      },
    ];

    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockJsonResponse(payload)) as unknown as typeof fetch;
    const res = await fetchInstagramPublicGeotags(baseParams({ fetchImpl: mockFetch }));

    expect(res.raw_handles_hashed.length).toBe(1);
    const first = res.raw_handles_hashed[0];
    expect(first).toBeDefined();
    // Does NOT contain the plaintext handle.
    expect(first).not.toBe(plainHandle);
    expect(first).not.toContain(plainHandle);
    // 64-char lowercase hex (sha256).
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    // Matches the deterministic hash via public hashHandle helper.
    const expected = createHash('sha256')
      .update(`${plainHandle}${COUNTRY}:${PERIOD}`)
      .digest('hex');
    expect(first).toBe(expected);
  });

  it('network error → APIFY_NETWORK_ERROR + zeros + confidence 0', async () => {
    vi.stubEnv('APIFY_TOKEN', 'test-token');
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error('network_down')) as unknown as typeof fetch;
    const res = await fetchInstagramPublicGeotags(baseParams({ fetchImpl: mockFetch }));
    expect(res.limitation).toBe('APIFY_NETWORK_ERROR');
    expect(res.chef_count).toBe(0);
    expect(res.gallery_count).toBe(0);
    expect(res.creator_count).toBe(0);
    expect(res.specialty_cafe_count).toBe(0);
    expect(res.source_confidence).toBe(0);
    expect(res.raw_handles_hashed).toEqual([]);
  });
});
