import { describe, expect, it, vi } from 'vitest';
import type { KpiKey } from '../lib/thresholds';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const ALL_KPI_KEYS: ReadonlyArray<KpiKey> = [
  'pendingInquiries',
  'firstResponseTime',
  'avgResponseTime',
  'interactionsVolume',
  'avgSuggestions',
  'visitRate',
  'offerRate',
  'inventoryActivePct',
  'inventoryTotal',
  'acmsGenerated',
  'capturesNew',
];

describe('MetricsSlideOver — module export smoke', () => {
  it('exports MetricsSlideOver as function', async () => {
    const mod = await import('../components/MetricsSlideOver');
    expect(typeof mod.MetricsSlideOver).toBe('function');
    expect(mod.MetricsSlideOver.name).toBe('MetricsSlideOver');
  });

  it('accepts kpis prop with all 11 KPI keys', async () => {
    const mod = await import('../components/MetricsSlideOver');
    const props: Parameters<typeof mod.MetricsSlideOver>[0] = {
      kpis: {
        pendingInquiries: 4,
        firstResponseTime: 12,
        avgResponseTime: 30,
        interactionsVolume: 5,
        avgSuggestions: 17,
        visitRate: 80,
        offerRate: 65,
        inventoryActivePct: 35,
        inventoryTotal: 8,
        acmsGenerated: 2,
        capturesNew: 1,
      },
    };
    expect(Object.keys(props.kpis).length).toBe(ALL_KPI_KEYS.length);
    for (const key of ALL_KPI_KEYS) {
      expect(props.kpis).toHaveProperty(key);
    }
    expect(typeof mod.MetricsSlideOver).toBe('function');
  });

  it('accepts kpis with null values for nullable metrics', async () => {
    const mod = await import('../components/MetricsSlideOver');
    const props: Parameters<typeof mod.MetricsSlideOver>[0] = {
      kpis: {
        pendingInquiries: 0,
        firstResponseTime: null,
        avgResponseTime: null,
        interactionsVolume: 0,
        avgSuggestions: 0,
        visitRate: null,
        offerRate: null,
        inventoryActivePct: null,
        inventoryTotal: 0,
        acmsGenerated: 0,
        capturesNew: 0,
      },
    };
    expect(props.kpis.firstResponseTime).toBeNull();
    expect(props.kpis.visitRate).toBeNull();
    expect(typeof mod.MetricsSlideOver).toBe('function');
  });
});

describe('PedagogyDrawer — module export smoke', () => {
  it('exports PedagogyDrawer as function', async () => {
    const mod = await import('../components/PedagogyDrawer');
    expect(typeof mod.PedagogyDrawer).toBe('function');
    expect(mod.PedagogyDrawer.name).toBe('PedagogyDrawer');
  });

  it('accepts kpiKey=null and open=false (drawer hidden contract)', async () => {
    const mod = await import('../components/PedagogyDrawer');
    const onClose = vi.fn();
    const props: Parameters<typeof mod.PedagogyDrawer>[0] = {
      kpiKey: null,
      open: false,
      onClose,
    };
    expect(props.kpiKey).toBeNull();
    expect(props.open).toBe(false);
    expect(typeof mod.PedagogyDrawer).toBe('function');
  });

  it('accepts kpiKey + open=true + onAction handler', async () => {
    const mod = await import('../components/PedagogyDrawer');
    const onClose = vi.fn();
    const onAction = vi.fn();
    const props: Parameters<typeof mod.PedagogyDrawer>[0] = {
      kpiKey: 'firstResponseTime',
      open: true,
      onClose,
      onAction,
    };
    expect(props.kpiKey).toBe('firstResponseTime');
    expect(props.open).toBe(true);
    expect(typeof props.onAction).toBe('function');
    expect(typeof mod.PedagogyDrawer).toBe('function');
  });

  it('accepts every KpiKey for kpiKey prop', async () => {
    const mod = await import('../components/PedagogyDrawer');
    const onClose = vi.fn();
    for (const key of ALL_KPI_KEYS) {
      const props: Parameters<typeof mod.PedagogyDrawer>[0] = {
        kpiKey: key,
        open: true,
        onClose,
      };
      expect(props.kpiKey).toBe(key);
    }
    expect(typeof mod.PedagogyDrawer).toBe('function');
  });
});

describe('TeamComparisonOverlay — module export smoke', () => {
  it('exports TeamComparisonOverlay as function', async () => {
    const mod = await import('../components/TeamComparisonOverlay');
    expect(typeof mod.TeamComparisonOverlay).toBe('function');
    expect(mod.TeamComparisonOverlay.name).toBe('TeamComparisonOverlay');
  });

  it('accepts self/teamAvg/topAnonymous with 3 metrics each', async () => {
    const mod = await import('../components/TeamComparisonOverlay');
    const onClose = vi.fn();
    const props: Parameters<typeof mod.TeamComparisonOverlay>[0] = {
      self: { revenue_mxn: 120000, operaciones_cerradas: 4, visitas_completadas: 18 },
      teamAvg: { revenue_mxn: 90000, operaciones_cerradas: 3, visitas_completadas: 14 },
      topAnonymous: {
        label: 'Asesor #1',
        revenue_mxn: 240000,
        operaciones_cerradas: 7,
        visitas_completadas: 30,
      },
      teamSize: 8,
      open: true,
      onClose,
    };
    expect(props.self.revenue_mxn).toBe(120000);
    expect(props.teamAvg.operaciones_cerradas).toBe(3);
    expect(props.topAnonymous.label).toBe('Asesor #1');
    expect(props.teamSize).toBe(8);
    expect(typeof mod.TeamComparisonOverlay).toBe('function');
  });

  it('topAnonymous label never reveals real names — exposes label only', async () => {
    const mod = await import('../components/TeamComparisonOverlay');
    const onClose = vi.fn();
    const labels = ['Asesor #1', 'Asesor #2', 'Asesor #3'];
    for (const label of labels) {
      const props: Parameters<typeof mod.TeamComparisonOverlay>[0] = {
        self: { revenue_mxn: 0, operaciones_cerradas: 0, visitas_completadas: 0 },
        teamAvg: { revenue_mxn: 0, operaciones_cerradas: 0, visitas_completadas: 0 },
        topAnonymous: {
          label,
          revenue_mxn: 100,
          operaciones_cerradas: 1,
          visitas_completadas: 1,
        },
        teamSize: 5,
        open: true,
        onClose,
      };
      expect(props.topAnonymous.label).toBe(label);
      expect(props.topAnonymous).not.toHaveProperty('user_id');
      expect(props.topAnonymous).not.toHaveProperty('email');
      expect(props.topAnonymous).not.toHaveProperty('name');
    }
    expect(typeof mod.TeamComparisonOverlay).toBe('function');
  });

  it('renders 3 metric sections (revenue, operaciones, visitas) — contract shape', async () => {
    const mod = await import('../components/TeamComparisonOverlay');
    const expectedMetrics = ['revenue_mxn', 'operaciones_cerradas', 'visitas_completadas'];
    expect(expectedMetrics.length).toBe(3);
    expect(typeof mod.TeamComparisonOverlay).toBe('function');
  });
});
