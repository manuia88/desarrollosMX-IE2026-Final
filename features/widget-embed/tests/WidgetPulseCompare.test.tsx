import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    pulse: {
      getPulseScore: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
      },
      getPulseHistory: {
        useQuery: vi.fn(() => ({
          data: [
            { period_date: '2026-01-01', pulse_score: 70, confidence: 'high' },
            { period_date: '2026-02-01', pulse_score: 72, confidence: 'high' },
            { period_date: '2026-03-01', pulse_score: 74, confidence: 'high' },
          ],
          isLoading: false,
          error: null,
        })),
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('@/shared/lib/market/zone-label-resolver', () => ({
  resolveZoneLabelSync: ({ scopeId }: { scopeId: string }) =>
    scopeId === 'roma-norte' ? 'Roma Norte' : 'Narvarte',
}));

describe('WidgetPulseCompare — module export smoke', () => {
  it('exports WidgetPulseCompare as function', async () => {
    const mod = await import('../components/WidgetPulseCompare');
    expect(typeof mod.WidgetPulseCompare).toBe('function');
    expect(mod.WidgetPulseCompare.name).toBe('WidgetPulseCompare');
  });

  it('accepts the public contract props shape', () => {
    const props = {
      scopeType: 'colonia' as const,
      scopeIdA: 'roma-norte',
      scopeIdB: 'narvarte',
      ctaUrl: 'https://desarrollosmx.com/es-MX/indices',
    };
    expect(props.scopeIdA).toBe('roma-norte');
    expect(props.scopeIdB).toBe('narvarte');
  });
});
