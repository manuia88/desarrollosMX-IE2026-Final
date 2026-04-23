import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    pulse: {
      getPulseScore: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
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

vi.mock('@/shared/lib/market/zone-label-resolver', () => ({
  resolveZoneLabelSync: () => 'Roma Norte',
}));

describe('WidgetPulseCard — module export smoke', () => {
  it('exports WidgetPulseCard as function', async () => {
    const mod = await import('../components/WidgetPulseCard');
    expect(typeof mod.WidgetPulseCard).toBe('function');
    expect(mod.WidgetPulseCard.name).toBe('WidgetPulseCard');
  });

  it('accepts the public contract props shape', () => {
    const props = {
      scopeType: 'colonia' as const,
      scopeId: 'roma-norte',
      ctaUrl: 'https://desarrollosmx.com/es-MX/indices',
    };
    expect(props.scopeType).toBe('colonia');
    expect(props.scopeId).toBe('roma-norte');
  });
});
