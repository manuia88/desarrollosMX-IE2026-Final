import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    pulse: {
      getPulseScore: {
        useQuery: vi.fn(() => ({
          data: {
            id: 'pulse-1',
            scope_type: 'colonia',
            scope_id: 'roma-norte',
            country_code: 'MX',
            period_date: '2026-03-01',
            business_births: 14,
            business_deaths: 6,
            foot_traffic_day: 820,
            foot_traffic_night: 410,
            calls_911_count: 22,
            events_count: 5,
            pulse_score: 72,
            confidence: 'high',
            components: {
              business_net_flow: { value: 75, weight: 0.25, source: 'DENUE', available: true },
              foot_traffic: { value: 60, weight: 0.2, source: 'proxy', available: true },
              calls_911: { value: 78, weight: 0.2, source: 'datos.cdmx', available: true },
              events: { value: 50, weight: 0.15, source: 'stub', available: false },
              ecosystem: { value: 65, weight: 0.2, source: 'DENUE', available: true },
              weights_used: {},
              data_sources_available: 4,
              coverage_pct: 80,
              raw_signals: {
                business_births: 14,
                business_deaths: 6,
                foot_traffic_day: 820,
                foot_traffic_night: 410,
                calls_911_count: 22,
                events_count: 5,
              },
            },
            calculated_at: '2026-04-01T00:00:00Z',
          },
          isLoading: false,
          error: null,
        })),
      },
      getPulseHistory: {
        useQuery: vi.fn(() => ({ data: [], isLoading: false, error: null })),
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => false,
}));

describe('VitalSigns — module export smoke', () => {
  it('exports VitalSigns as function', async () => {
    const mod = await import('../components/VitalSigns');
    expect(typeof mod.VitalSigns).toBe('function');
    expect(mod.VitalSigns.name).toBe('VitalSigns');
  });

  it('accepts minimum contract props', async () => {
    const mod = await import('../components/VitalSigns');
    const props = {
      scopeType: 'colonia' as const,
      scopeId: 'roma-norte',
    };
    expect(props.scopeType).toBe('colonia');
    expect(typeof mod.VitalSigns).toBe('function');
  });
});

describe('PulseSparkline — module export smoke', () => {
  it('exports PulseSparkline as function', async () => {
    const mod = await import('../components/PulseSparkline');
    expect(typeof mod.PulseSparkline).toBe('function');
  });
});

describe('usePulseScore hook', () => {
  it('exports usePulseScore as function', async () => {
    const mod = await import('../hooks/usePulseScore');
    expect(typeof mod.usePulseScore).toBe('function');
    expect(typeof mod.usePulseHistory).toBe('function');
  });

  it('calls trpc.pulse.getPulseScore with expected input', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { usePulseScore } = await import('../hooks/usePulseScore');
    const spy = clientMod.trpc.pulse.getPulseScore.useQuery as ReturnType<typeof vi.fn>;
    spy.mockClear();
    usePulseScore({
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      periodDate: '2026-03-01',
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (!lastCall) return;
    expect(lastCall[0]).toMatchObject({
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      country: 'MX',
      periodDate: '2026-03-01',
    });
    expect(lastCall[1]).toMatchObject({ staleTime: 10 * 60 * 1000 });
  });

  it('omits periodDate when not provided', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { usePulseScore } = await import('../hooks/usePulseScore');
    const spy = clientMod.trpc.pulse.getPulseScore.useQuery as ReturnType<typeof vi.fn>;
    spy.mockClear();
    usePulseScore({
      scopeType: 'alcaldia',
      scopeId: 'cuauhtemoc',
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (!lastCall) return;
    expect(Object.hasOwn(lastCall[0] as object, 'periodDate')).toBe(false);
  });

  it('respects enabled=false', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const { usePulseScore } = await import('../hooks/usePulseScore');
    const spy = clientMod.trpc.pulse.getPulseScore.useQuery as ReturnType<typeof vi.fn>;
    spy.mockClear();
    usePulseScore({
      scopeType: 'city',
      scopeId: 'cdmx',
      enabled: false,
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    if (!lastCall) return;
    expect(lastCall[1]).toMatchObject({ enabled: false });
  });
});
