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

describe('pulseRouter — module export smoke', () => {
  it('exports pulseRouter with expected procedures', async () => {
    const mod = await import('../../../server/trpc/routers/pulse');
    expect(mod.pulseRouter).toBeDefined();
    const record = mod.pulseRouter as unknown as Record<string, unknown>;
    expect(record.getPulseScore).toBeDefined();
    expect(record.getPulseHistory).toBeDefined();
  });
});

describe('pulse schemas — input validation', () => {
  it('getPulseScoreInput parses valid input and applies country default', async () => {
    const { getPulseScoreInput } = await import('../schemas/pulse');
    const parsed = getPulseScoreInput.parse({
      scopeType: 'colonia',
      scopeId: 'roma-norte',
    });
    expect(parsed.country).toBe('MX');
    expect(parsed.scopeType).toBe('colonia');
    expect(parsed.scopeId).toBe('roma-norte');
  });

  it('getPulseScoreInput accepts explicit periodDate', async () => {
    const { getPulseScoreInput } = await import('../schemas/pulse');
    const parsed = getPulseScoreInput.parse({
      scopeType: 'alcaldia',
      scopeId: 'cuauhtemoc',
      country: 'MX',
      periodDate: '2026-03-01',
    });
    expect(parsed.periodDate).toBe('2026-03-01');
  });

  it('getPulseScoreInput rejects invalid scope type', async () => {
    const { getPulseScoreInput } = await import('../schemas/pulse');
    expect(() =>
      getPulseScoreInput.parse({
        scopeType: 'barrio',
        scopeId: 'x',
      }),
    ).toThrow();
  });

  it('getPulseScoreInput rejects malformed periodDate', async () => {
    const { getPulseScoreInput } = await import('../schemas/pulse');
    expect(() =>
      getPulseScoreInput.parse({
        scopeType: 'colonia',
        scopeId: 'roma-norte',
        periodDate: '2026/03/01',
      }),
    ).toThrow();
  });

  it('getPulseHistoryInput defaults months to 12', async () => {
    const { getPulseHistoryInput } = await import('../schemas/pulse');
    const parsed = getPulseHistoryInput.parse({
      scopeType: 'city',
      scopeId: 'cdmx',
    });
    expect(parsed.months).toBe(12);
  });

  it('getPulseHistoryInput accepts custom months', async () => {
    const { getPulseHistoryInput } = await import('../schemas/pulse');
    const parsed = getPulseHistoryInput.parse({
      scopeType: 'estado',
      scopeId: 'jalisco',
      months: 24,
    });
    expect(parsed.months).toBe(24);
  });

  it('getPulseHistoryInput rejects months out of range', async () => {
    const { getPulseHistoryInput } = await import('../schemas/pulse');
    expect(() =>
      getPulseHistoryInput.parse({
        scopeType: 'city',
        scopeId: 'cdmx',
        months: 120,
      }),
    ).toThrow();
  });
});
