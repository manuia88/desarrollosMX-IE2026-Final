import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => {
    function mkChain(data: ReadonlyArray<unknown>) {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(async () => ({ data, error: null })),
        or: vi.fn(() => chain),
      };
      return chain;
    }
    return {
      from: vi.fn((_table: string) => mkChain([])),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    };
  }),
}));

describe('zone-subscribe-builder — module exports', () => {
  it('exports buildZonePersonalizedBundle as function', async () => {
    const mod = await import('@/features/newsletter/lib/zone-subscribe-builder');
    expect(typeof mod.buildZonePersonalizedBundle).toBe('function');
  });

  it('returns a bundle shape even when no data', async () => {
    const mod = await import('@/features/newsletter/lib/zone-subscribe-builder');
    const bundle = await mod.buildZonePersonalizedBundle({
      subscriberId: 'sub-1',
      zoneScopeIds: [],
      countryCode: 'MX',
      periodDate: '2026-04-01',
      locale: 'es-MX',
    });
    expect(bundle.period_date).toBe('2026-04-01');
    expect(bundle.country_code).toBe('MX');
    expect(bundle.locale).toBe('es-MX');
    expect(Array.isArray(bundle.hero_top_five)).toBe(true);
    expect(bundle.pulse_section).toBeNull();
    expect(bundle.migration_section).toBeNull();
    expect(bundle.streaks_section).not.toBeNull();
  });
});

describe('zone-subscribe-builder — schema roundtrip', () => {
  it('newsletterPreferencesSchema parses defaults', async () => {
    const { newsletterPreferencesSchema } = await import(
      '@/features/newsletter/schemas/newsletter'
    );
    const parsed = newsletterPreferencesSchema.parse({
      frequency: 'monthly',
      zone_scope_ids: ['roma-norte'],
      sections: {
        pulse: true,
        migration: true,
        causal: true,
        alpha: false,
        scorecard: true,
        streaks: true,
      },
    });
    expect(parsed.frequency).toBe('monthly');
    expect(parsed.zone_scope_ids).toEqual(['roma-norte']);
  });
});
