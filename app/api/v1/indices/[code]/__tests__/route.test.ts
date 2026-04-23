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

const latestResponse = { data: { period_date: '2026-03-01' }, error: null };
const listResponse = {
  data: [
    {
      scope_id: 'col-1',
      scope_type: 'colonia',
      index_code: 'IPV',
      period_date: '2026-03-01',
      value: 88.2,
      ranking_in_scope: 1,
      percentile: 95,
      score_band: 'A+',
      confidence: 'high',
      trend_direction: 'up',
    },
  ],
  error: null,
  count: 1,
};

function makeChain(isLatest: boolean) {
  const chain: Record<string, unknown> = {};
  const self = chain as {
    [k: string]: (...a: unknown[]) => unknown;
  };
  self.select = vi.fn(() => chain);
  self.eq = vi.fn(() => chain);
  self.order = vi.fn(() => chain);
  self.limit = vi.fn(() => (isLatest ? chain : Promise.resolve(listResponse)));
  self.maybeSingle = vi.fn(async () => latestResponse);
  return chain;
}

let latestChain: ReturnType<typeof makeChain>;
let listChain: ReturnType<typeof makeChain>;
let fromCallCount = 0;

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      fromCallCount++;
      // First call → latest period lookup (maybeSingle). Second → list.
      if (fromCallCount === 1) {
        latestChain = makeChain(true);
        return latestChain;
      }
      listChain = makeChain(false);
      return listChain;
    },
  }),
}));

import { GET } from '../route';

function makeReq(code: string, qs = '', headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost/api/v1/indices/${code}${qs}`, { headers });
}

beforeEach(() => {
  verifyApiKeyMock.mockReset();
  enforceMock.mockReset();
  fromCallCount = 0;
});

describe('GET /api/v1/indices/[code]', () => {
  it('returns 404 for unknown index code', async () => {
    const res = await GET(makeReq('ZZZ'), { params: Promise.resolve({ code: 'ZZZ' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 with ranking items when tier=free', async () => {
    verifyApiKeyMock.mockResolvedValue(null);
    enforceMock.mockResolvedValue({
      allowed: true,
      tier: 'free',
      remaining: 99,
      reset_at: '2099-01-01T00:00:00.000Z',
    });

    const res = await GET(makeReq('IPV'), { params: Promise.resolve({ code: 'IPV' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items.length).toBe(1);
    expect(body.data.index_code).toBe('IPV');
  });

  it('returns 429 when rate limited', async () => {
    verifyApiKeyMock.mockResolvedValue(null);
    enforceMock.mockResolvedValue({
      allowed: false,
      tier: 'free',
      remaining: 0,
      reset_at: '2099-01-01T00:00:00.000Z',
    });

    const res = await GET(makeReq('IPV'), { params: Promise.resolve({ code: 'IPV' }) });
    expect(res.status).toBe(429);
  });
});
