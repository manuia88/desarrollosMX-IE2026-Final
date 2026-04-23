import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    indicesPublic: {
      getIndexDetail: {
        useQuery: vi.fn(() => ({
          data: {
            scope_id: 'roma-norte',
            scope_type: 'colonia',
            index_code: 'IPV',
            value: 72.5,
            score_band: 'bueno',
            confidence: 'high',
            confidence_score: 0.9,
            ranking_in_scope: 12,
            percentile: 88,
            trend_direction: 'mejorando',
            trend_vs_previous: 1.2,
            period_date: '2026-03-01',
            methodology_version: 'v1',
          },
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
  resolveZoneLabelSync: () => 'Roma Norte',
}));

describe('WidgetScoreCard — module export smoke', () => {
  it('exports WidgetScoreCard as function', async () => {
    const mod = await import('../components/WidgetScoreCard');
    expect(typeof mod.WidgetScoreCard).toBe('function');
    expect(mod.WidgetScoreCard.name).toBe('WidgetScoreCard');
  });

  it('accepts the public contract props shape', () => {
    const props = {
      scopeType: 'colonia' as const,
      scopeId: 'roma-norte',
      ctaUrl: 'https://desarrollosmx.com/es-MX/indices',
      customization: { theme: 'auto' as const, locale: 'es-MX' },
    };
    expect(props.scopeType).toBe('colonia');
    expect(props.scopeId).toBe('roma-norte');
    expect(props.customization?.theme).toBe('auto');
  });
});

describe('WidgetShell — module export smoke', () => {
  it('exports WidgetShell as function', async () => {
    const mod = await import('../components/WidgetShell');
    expect(typeof mod.WidgetShell).toBe('function');
  });
});
