import type { User } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

// ---------------- Mock helpers ----------------

interface QueryShape {
  readonly data: unknown;
  readonly error: unknown;
}

interface FromMock {
  // biome-ignore lint/suspicious/noExplicitAny: test helper shape varies by caller
  readonly select: (cols?: string) => any;
  // biome-ignore lint/suspicious/noExplicitAny: idem
  readonly insert: (row: unknown) => any;
}

function chainableQuery(result: QueryShape) {
  // biome-ignore lint/suspicious/noExplicitAny: chainable stub
  const chain: any = {
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    // biome-ignore lint/suspicious/noThenProperty: supabase builder is thenable; required for test await
    then: (resolve: (v: QueryShape) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function insertResult(result: QueryShape) {
  return {
    // biome-ignore lint/suspicious/noThenProperty: supabase insert builder is thenable
    then: (resolve: (v: QueryShape) => unknown) => Promise.resolve(result).then(resolve),
  };
}

function makeFromImpl(
  registry: Record<string, QueryShape>,
  insertRegistry: Record<string, QueryShape> = {},
) {
  return (table: string): FromMock => ({
    select: (_cols?: string) => chainableQuery(registry[table] ?? { data: [], error: null }),
    insert: (_row: unknown) => insertResult(insertRegistry[table] ?? { data: null, error: null }),
  });
}

// ---------------- Module-level mocks ----------------

vi.mock('@/shared/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/security/rate-limit')>(
    '@/shared/lib/security/rate-limit',
  );
  return {
    ...actual,
    checkRateLimit: vi.fn(async () => ({ allowed: true })),
  };
});

// Shared admin client state (mutated per test).
let adminSelectRegistry: Record<string, QueryShape> = {};
let adminInsertRegistry: Record<string, QueryShape> = {};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      const impl = makeFromImpl(adminSelectRegistry, adminInsertRegistry);
      return impl(table);
    },
    rpc: vi.fn(async () => ({ data: true, error: null })),
  })),
}));

// Bypass rate-limit RPC in authenticatedProcedure.
const baseCtxSupabaseRpc = vi.fn(async () => ({ data: true, error: null }));

interface CtxOverrides {
  readonly userId?: string | null;
  readonly rol?: string | null;
  readonly subscriptionRows?: ReadonlyArray<{ id: string; status: string }>;
  readonly subscriptionError?: unknown;
  readonly subscribeError?: unknown;
  readonly subscribeInsertData?: unknown;
}

function buildCtx(overrides: CtxOverrides = {}): Context {
  const userId = overrides.userId ?? 'user-test-1';
  const profile = overrides.rol === null ? null : { id: userId, rol: overrides.rol ?? 'user' };

  const subscriptionResult: QueryShape = {
    data: overrides.subscriptionRows ?? [],
    error: overrides.subscriptionError ?? null,
  };
  const subscribeResult: QueryShape = {
    data: overrides.subscribeInsertData ?? null,
    error: overrides.subscribeError ?? null,
  };

  // biome-ignore lint/suspicious/noExplicitAny: chained stub
  const ctxSupabase: any = {
    rpc: baseCtxSupabaseRpc,
    from: (table: string) => {
      if (table === 'subscriptions') {
        return {
          select: (_cols?: string) => chainableQuery(subscriptionResult),
        };
      }
      if (table === 'zone_alert_subscriptions') {
        return {
          insert: (_row: unknown) => insertResult(subscribeResult),
        };
      }
      return {
        select: (_cols?: string) => chainableQuery({ data: [], error: null }),
        insert: (_row: unknown) => insertResult({ data: null, error: null }),
      };
    },
  };

  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: userId === null ? null : ({ id: userId, email: 'test@example.com' } as unknown as User),
    profile,
  } as unknown as Context;
}

// ---------------- Tests ----------------

beforeEach(() => {
  adminSelectRegistry = {};
  adminInsertRegistry = {};
  baseCtxSupabaseRpc.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('trendGenomeRouter — exports smoke', () => {
  it('exports trendGenomeRouter with expected procedures', async () => {
    const mod = await import('../trend-genome');
    expect(mod.trendGenomeRouter).toBeDefined();
    const record = mod.trendGenomeRouter as unknown as Record<string, unknown>;
    expect(record.getAlphaZones).toBeDefined();
    expect(record.getAlphaZoneDetail).toBeDefined();
    expect(record.subscribeToAlphaAlerts).toBeDefined();
    expect(record.getAlphaCount).toBeDefined();
    expect(record.getAlphaAccuracy).toBeDefined();
  });
});

describe('trendGenomeRouter.getAlphaCount (public)', () => {
  it('returns teaser shape with counts for country MX', async () => {
    adminSelectRegistry = {
      zone_alpha_alerts: {
        data: [
          {
            alpha_score: 82,
            detected_at: '2026-03-10T00:00:00Z',
            signals: { tier: 'confirmed' },
          },
          {
            alpha_score: 76,
            detected_at: '2026-04-01T00:00:00Z',
            signals: { tier: 'golden_opportunity' },
          },
          {
            alpha_score: 60,
            detected_at: '2026-03-15T00:00:00Z',
            signals: { tier: 'speculative' },
          },
        ],
        error: null,
      },
    };

    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(buildCtx());
    const result = await caller.getAlphaCount({ country: 'MX' });

    expect(result.country_code).toBe('MX');
    expect(result.total_alpha_zones).toBe(3);
    expect(result.confirmed_count).toBe(1);
    expect(result.golden_opportunity_count).toBe(1);
    expect(result.last_updated_at).toBe('2026-04-01T00:00:00Z');
  });
});

describe('trendGenomeRouter.getAlphaZones (Pro+ gated)', () => {
  it('throws FORBIDDEN when user has no active subscription', async () => {
    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(buildCtx({ rol: 'user', subscriptionRows: [] }));
    await expect(caller.getAlphaZones({ country: 'MX' })).rejects.toThrow(
      /pro_tier_required|FORBIDDEN/i,
    );
  });

  it('returns rows when user is superadmin', async () => {
    adminSelectRegistry = {
      zone_alpha_alerts: {
        data: [
          {
            zone_id: 'roma-norte',
            scope_type: 'colonia',
            country_code: 'MX',
            alpha_score: 88,
            time_to_mainstream_months: 12,
            signals: { tier: 'confirmed', needs_review: false },
            detected_at: '2026-04-01T00:00:00Z',
            is_active: true,
          },
        ],
        error: null,
      },
    };

    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(buildCtx({ rol: 'superadmin' }));
    const result = await caller.getAlphaZones({ country: 'MX' });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.zone_id).toBe('roma-norte');
    expect(first.tier).toBe('confirmed');
    expect(first.alpha_score).toBe(88);
  });

  it('returns rows when user has active subscription', async () => {
    adminSelectRegistry = {
      zone_alpha_alerts: {
        data: [
          {
            zone_id: 'condesa',
            scope_type: 'colonia',
            country_code: 'MX',
            alpha_score: 77,
            time_to_mainstream_months: 18,
            signals: { tier: 'speculative', needs_review: false },
            detected_at: '2026-04-02T00:00:00Z',
            is_active: true,
          },
        ],
        error: null,
      },
    };

    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(
      buildCtx({
        rol: 'user',
        subscriptionRows: [{ id: 'sub-1', status: 'active' }],
      }),
    );
    const result = await caller.getAlphaZones({ country: 'MX' });
    expect(result.length).toBe(1);
    const [first] = result;
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.zone_id).toBe('condesa');
  });
});

describe('trendGenomeRouter.getAlphaZoneDetail', () => {
  it('throws NOT_FOUND when zone has no alert', async () => {
    adminSelectRegistry = {
      zone_alpha_alerts: { data: null, error: null },
    };

    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(buildCtx({ rol: 'superadmin' }));

    await expect(
      caller.getAlphaZoneDetail({ zoneId: 'missing-zone', country: 'MX' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('trendGenomeRouter.subscribeToAlphaAlerts', () => {
  it('returns subscribed=true when insert succeeds', async () => {
    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(
      buildCtx({
        rol: 'superadmin',
        subscribeInsertData: null,
        subscribeError: null,
      }),
    );
    const res = await caller.subscribeToAlphaAlerts({
      zoneId: 'zone-x',
      channel: 'email',
      country: 'MX',
    });
    expect(res).toMatchObject({ subscribed: true, zoneId: 'zone-x', channel: 'email' });
  });

  it('returns TABLE_NOT_FOUND when table missing (42P01)', async () => {
    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(
      buildCtx({
        rol: 'superadmin',
        subscribeError: { code: '42P01', message: 'relation does not exist' },
      }),
    );
    const res = await caller.subscribeToAlphaAlerts({
      zoneId: 'zone-x',
      channel: 'email',
      country: 'MX',
    });
    expect(res).toEqual({ subscribed: false, reason: 'TABLE_NOT_FOUND' });
  });
});

describe('trendGenomeRouter.getAlphaAccuracy (public)', () => {
  it('returns insufficient_backtest_data_h1 when no history', async () => {
    adminSelectRegistry = {
      zone_alpha_alerts: { data: [], error: null },
    };

    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(buildCtx());
    const res = await caller.getAlphaAccuracy({ country: 'MX', monthsLookback: 12 });
    expect(res.historical_count).toBe(0);
    expect(res.realized_count).toBe(0);
    expect(res.accuracy_pct).toBeNull();
    expect(res.note).toBe('insufficient_backtest_data_h1');
  });
});

describe('trendGenomeRouter — TRPCError types', () => {
  it('uses TRPCError for FORBIDDEN', async () => {
    const { trendGenomeRouter } = await import('../trend-genome');
    const caller = trendGenomeRouter.createCaller(buildCtx({ rol: 'user', subscriptionRows: [] }));
    try {
      await caller.getAlphaZones({ country: 'MX' });
      expect.fail('expected FORBIDDEN');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });
});
