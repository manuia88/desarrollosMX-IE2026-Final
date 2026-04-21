import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
    rpc: vi.fn(async () => ({ data: true, error: null })),
  })),
}));

vi.mock('@/shared/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/security/rate-limit')>(
    '@/shared/lib/security/rate-limit',
  );
  return {
    ...actual,
    checkRateLimit: vi.fn(async () => ({ allowed: true })),
  };
});

describe('migrationFlowRouter — module export smoke', () => {
  it('exports migrationFlowRouter with expected procedures', async () => {
    const mod = await import('../../../server/trpc/routers/migration-flow');
    expect(mod.migrationFlowRouter).toBeDefined();
    const record = mod.migrationFlowRouter as unknown as Record<string, unknown>;
    expect(record.getFlowsForZone).toBeDefined();
    expect(record.getTopFlows).toBeDefined();
    expect(record.getFlowMap).toBeDefined();
  });
});

describe('migration-flow schemas — input validation', () => {
  it('getFlowsForZoneInput applies country default MX and limit default', async () => {
    const { getFlowsForZoneInput } = await import('../schemas/flow');
    const parsed = getFlowsForZoneInput.parse({
      zoneId: 'roma-norte',
      direction: 'inflow',
    });
    expect(parsed.country).toBe('MX');
    expect(parsed.scopeType).toBe('colonia');
    expect(parsed.direction).toBe('inflow');
    expect(parsed.limit).toBe(20);
  });

  it('getFlowsForZoneInput accepts outflow direction and periodDate', async () => {
    const { getFlowsForZoneInput } = await import('../schemas/flow');
    const parsed = getFlowsForZoneInput.parse({
      zoneId: 'cuauhtemoc',
      scopeType: 'alcaldia',
      direction: 'outflow',
      periodDate: '2026-03-01',
      limit: 50,
    });
    expect(parsed.direction).toBe('outflow');
    expect(parsed.periodDate).toBe('2026-03-01');
    expect(parsed.limit).toBe(50);
  });

  it('getFlowsForZoneInput rejects invalid direction', async () => {
    const { getFlowsForZoneInput } = await import('../schemas/flow');
    expect(() =>
      getFlowsForZoneInput.parse({
        zoneId: 'x',
        direction: 'unknown',
      }),
    ).toThrow();
  });

  it('getFlowsForZoneInput rejects malformed periodDate', async () => {
    const { getFlowsForZoneInput } = await import('../schemas/flow');
    expect(() =>
      getFlowsForZoneInput.parse({
        zoneId: 'x',
        direction: 'inflow',
        periodDate: '2026/03/01',
      }),
    ).toThrow();
  });

  it('getTopFlowsInput accepts incomeDecile filters', async () => {
    const { getTopFlowsInput } = await import('../schemas/flow');
    const parsed = getTopFlowsInput.parse({
      incomeDecileMin: 3,
      incomeDecileMax: 9,
    });
    expect(parsed.incomeDecileMin).toBe(3);
    expect(parsed.incomeDecileMax).toBe(9);
    expect(parsed.limit).toBe(10);
  });

  it('getTopFlowsInput rejects incomeDecile out of range', async () => {
    const { getTopFlowsInput } = await import('../schemas/flow');
    expect(() =>
      getTopFlowsInput.parse({
        incomeDecileMin: 12,
      }),
    ).toThrow();
  });

  it('getFlowMapInput default limit is 200 max 500', async () => {
    const { getFlowMapInput } = await import('../schemas/flow');
    const parsed = getFlowMapInput.parse({});
    expect(parsed.limit).toBe(200);
    expect(() => getFlowMapInput.parse({ limit: 600 })).toThrow();
  });
});

describe('migration-flow router — rate limit behavior', () => {
  it('throws TOO_MANY_REQUESTS when checkRateLimit returns allowed=false', async () => {
    vi.resetModules();

    vi.doMock('@/shared/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => ({
        from: vi.fn(),
        rpc: vi.fn(async () => ({ data: true, error: null })),
      })),
    }));

    vi.doMock('@/shared/lib/security/rate-limit', async () => {
      const actual = await vi.importActual<typeof import('@/shared/lib/security/rate-limit')>(
        '@/shared/lib/security/rate-limit',
      );
      return {
        ...actual,
        checkRateLimit: vi.fn(async () => ({ allowed: false })),
      };
    });

    const { migrationFlowRouter } = await import('../../../server/trpc/routers/migration-flow');
    const record = migrationFlowRouter as unknown as {
      readonly getTopFlows: {
        readonly _def: {
          readonly resolver: (opts: {
            readonly input: unknown;
            readonly ctx: { readonly headers: Headers | undefined };
          }) => Promise<unknown>;
        };
      };
    };

    const resolver = record.getTopFlows._def.resolver;
    await expect(
      resolver({
        input: {
          country: 'MX',
          scopeType: 'colonia',
          limit: 10,
        },
        ctx: { headers: new Headers() },
      }),
    ).rejects.toThrow(/rate_limit_exceeded|TOO_MANY_REQUESTS/i);

    vi.doUnmock('@/shared/lib/security/rate-limit');
    vi.doUnmock('@/shared/lib/supabase/admin');
  });
});
