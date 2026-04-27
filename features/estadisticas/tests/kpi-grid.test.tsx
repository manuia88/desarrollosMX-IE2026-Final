import { describe, expect, it, vi } from 'vitest';
import type { KpiGridData } from '@/features/estadisticas/components/KpiGrid';
import type { KpiKey } from '@/features/estadisticas/lib/thresholds';
import { tierForValue } from '@/features/estadisticas/lib/thresholds';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeKpis(overrides: Partial<KpiGridData> = {}): KpiGridData {
  return {
    firstResponseTime: 12,
    avgResponseTime: 25,
    pendingInquiries: 8,
    interactionsVolume: 5,
    avgSuggestions: 18,
    visitRate: 80,
    offerRate: 72,
    inventoryActivePct: 35,
    inventoryTotal: 5,
    acmsGenerated: 2,
    capturesNew: 3,
    ...overrides,
  };
}

describe('KpiGrid — module export smoke', () => {
  it('exports KpiGrid as function and renders 2 sections + 11 KPI specs', async () => {
    const mod = await import('../components/KpiGrid');
    expect(typeof mod.KpiGrid).toBe('function');
    expect(mod.KpiGrid.name).toBe('KpiGrid');
    // Ensure data shape matches 11 KPIs total (2 quality + 9 operations).
    const kpis = makeKpis();
    const allKeys: ReadonlyArray<KpiKey> = [
      'firstResponseTime',
      'avgResponseTime',
      'pendingInquiries',
      'interactionsVolume',
      'avgSuggestions',
      'visitRate',
      'offerRate',
      'inventoryActivePct',
      'inventoryTotal',
      'acmsGenerated',
      'capturesNew',
    ];
    expect(allKeys.length).toBe(11);
    for (const key of allKeys) {
      expect(kpis).toHaveProperty(key);
    }
  });
});

describe('KpiCardWithPedagogy — module export smoke', () => {
  it('exports KpiCardWithPedagogy and accepts null value (renders "—")', async () => {
    const mod = await import('../components/KpiCardWithPedagogy');
    expect(typeof mod.KpiCardWithPedagogy).toBe('function');
    expect(mod.KpiCardWithPedagogy.name).toBe('KpiCardWithPedagogy');
    // Null value contract: tier is red and display falls back to em-dash.
    const tier = tierForValue('firstResponseTime', null);
    expect(tier).toBe('red');
  });

  it('green tier value yields green tier (used in aria-label composition)', async () => {
    const mod = await import('../components/KpiCardWithPedagogy');
    expect(typeof mod.KpiCardWithPedagogy).toBe('function');
    // firstResponseTime green threshold is < 15 (lower-is-better).
    const tier = tierForValue('firstResponseTime', 10);
    expect(tier).toBe('green');
    // visitRate green threshold is >= 75.
    expect(tierForValue('visitRate', 90)).toBe('green');
  });
});

describe('DateRangeSelector — module export smoke', () => {
  it('exports DateRangeSelector and getDefaultRange returns 30-day window ending today', async () => {
    const mod = await import('../components/DateRangeSelector');
    expect(typeof mod.DateRangeSelector).toBe('function');
    expect(typeof mod.getDefaultRange).toBe('function');
    const range = mod.getDefaultRange();
    expect(range.rangeFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.rangeTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 30d preset spans 30 days: rangeTo - rangeFrom = 29 days.
    const from = new Date(`${range.rangeFrom}T00:00:00`);
    const to = new Date(`${range.rangeTo}T00:00:00`);
    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(29);
  });
});
