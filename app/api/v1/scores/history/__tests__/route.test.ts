import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyApiKeyMock = vi.fn();
const enforceMock = vi.fn();

vi.mock('@/features/api-v1/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/api-v1/lib/auth')>(
    '@/features/api-v1/lib/auth',
  );
  return {
    ...actual,
    verifyApiKey: (...a: unknown[]) => verifyApiKeyMock(...a),
  };
});

vi.mock('@/features/api-v1/lib/rate-limit-tier', () => ({
  enforceRateLimitForTier: (...a: unknown[]) => enforceMock(...a),
}));

const adminRows: Array<Record<string, unknown>> = [];
const fromChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockImplementation(() => Promise.resolve({ data: adminRows, error: null })),
};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => fromChain,
  }),
}));

import { GET } from '../route';

function makeReq(qs: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost/api/v1/scores/history${qs}`, { headers });
}

beforeEach(() => {
  verifyApiKeyMock.mockReset();
  enforceMock.mockReset();
  adminRows.length = 0;
  fromChain.select.mockClear();
  fromChain.eq.mockClear();
  fromChain.gte.mockClear();
  fromChain.lt.mockClear();
  fromChain.or.mockClear();
  fromChain.order.mockClear();
  fromChain.limit.mockClear();
  fromChain.limit.mockImplementation(() => Promise.resolve({ data: adminRows, error: null }));
});

describe('GET /api/v1/scores/history', () => {
  it('returns 400 when query is invalid', async () => {
    const res = await GET(makeReq('?scope=colonia'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_payload');
  });

  it('returns 200 with free tier when no api key', async () => {
    verifyApiKeyMock.mockResolvedValue(null);
    enforceMock.mockResolvedValue({
      allowed: true,
      tier: 'free',
      remaining: 99,
      reset_at: '2099-01-01T00:00:00.000Z',
    });
    adminRows.push({
      id: '00000000-0000-4000-8000-000000000001',
      period_date: '2026-01-01',
      period_type: 'monthly',
      value: 75.5,
      confidence: 'high',
      confidence_score: 0.9,
      percentile: 85,
      ranking_in_scope: 1,
      score_band: 'A',
      trend_direction: 'up',
      trend_vs_previous: 2.5,
      methodology_version: 'v1.0',
    });

    const res = await GET(makeReq('?scope=colonia&id=abc&indexCode=IPV&limit=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tier).toBe('free');
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].id).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('returns 429 when rate limit exhausted', async () => {
    verifyApiKeyMock.mockResolvedValue(null);
    enforceMock.mockResolvedValue({
      allowed: false,
      tier: 'free',
      remaining: 0,
      reset_at: '2099-01-01T00:00:00.000Z',
    });

    const res = await GET(makeReq('?scope=colonia&id=abc&indexCode=IPV'));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('rate_limited');
  });

  it('uses verified tier when api key is valid', async () => {
    verifyApiKeyMock.mockResolvedValue({
      apiKeyId: 'k1',
      profileId: 'p1',
      tier: 'pro',
      scopes: ['tier:pro'],
    });
    enforceMock.mockResolvedValue({
      allowed: true,
      tier: 'pro',
      remaining: 9999,
      reset_at: '2099-01-01T00:00:00.000Z',
    });

    const res = await GET(
      makeReq('?scope=colonia&id=abc&indexCode=IPV', {
        'x-dmx-api-key': 'dmx_xxxxxxxxxxxx',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe('pro');
  });
});
