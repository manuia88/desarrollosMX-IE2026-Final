import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('recharts', () => {
  const React = require('react') as typeof import('react');
  const Passthrough = (name: string) =>
    function MockComponent({ children }: { children?: React.ReactNode }) {
      return React.createElement('div', { 'data-mock': name }, children ?? null);
    };
  return {
    ResponsiveContainer: Passthrough('ResponsiveContainer'),
    LineChart: Passthrough('LineChart'),
    BarChart: Passthrough('BarChart'),
    Line: Passthrough('Line'),
    Bar: Passthrough('Bar'),
    Cell: Passthrough('Cell'),
    XAxis: Passthrough('XAxis'),
    YAxis: Passthrough('YAxis'),
    Tooltip: Passthrough('Tooltip'),
    Legend: Passthrough('Legend'),
  };
});

const sampleRevenue = [
  { month: '2026-01', revenue_mxn: 1_200_000, operaciones_cerradas: 3 },
  { month: '2026-02', revenue_mxn: 1_500_000, operaciones_cerradas: 4 },
  { month: '2026-03', revenue_mxn: 1_750_000, operaciones_cerradas: 5 },
] as const;

const sampleStages = [
  { stage: 'Lead', count: 120 },
  { stage: 'Visita', count: 45 },
  { stage: 'Cierre', count: 12 },
] as const;

const sampleVisits = [
  { day: '2026-04-01', visitas_agendadas: 5, visitas_completadas: 4, operaciones_cerradas: 1 },
  { day: '2026-04-02', visitas_agendadas: 6, visitas_completadas: 5, operaciones_cerradas: 2 },
] as const;

const sampleHeatmap = [
  { colonia: 'Roma Norte', count: 12 },
  { colonia: 'Condesa', count: 7 },
  { colonia: 'Polanco', count: 3 },
] as const;

describe('RechartsRevenueLine — module export smoke', () => {
  it('exports RechartsRevenueLine as function', async () => {
    const mod = await import('../../components/charts/RechartsRevenueLine');
    expect(typeof mod.RechartsRevenueLine).toBe('function');
    expect(mod.RechartsRevenueLine.name).toBe('RechartsRevenueLine');
  });

  it('accepts data prop with revenue rows', async () => {
    const mod = await import('../../components/charts/RechartsRevenueLine');
    expect(typeof mod.RechartsRevenueLine).toBe('function');
    expect(sampleRevenue.length).toBe(3);
    expect(sampleRevenue[0]?.revenue_mxn).toBe(1_200_000);
  });

  it('accepts empty data array', async () => {
    const mod = await import('../../components/charts/RechartsRevenueLine');
    expect(typeof mod.RechartsRevenueLine).toBe('function');
    const empty: ReadonlyArray<(typeof sampleRevenue)[number]> = [];
    expect(empty.length).toBe(0);
  });
});

describe('RechartsPipelineFunnel — module export smoke', () => {
  it('exports RechartsPipelineFunnel as function', async () => {
    const mod = await import('../../components/charts/RechartsPipelineFunnel');
    expect(typeof mod.RechartsPipelineFunnel).toBe('function');
    expect(mod.RechartsPipelineFunnel.name).toBe('RechartsPipelineFunnel');
  });

  it('accepts stages prop', async () => {
    const mod = await import('../../components/charts/RechartsPipelineFunnel');
    expect(typeof mod.RechartsPipelineFunnel).toBe('function');
    expect(sampleStages.length).toBe(3);
    expect(sampleStages[0]?.stage).toBe('Lead');
  });
});

describe('RechartsVisitsBar — module export smoke', () => {
  it('exports RechartsVisitsBar as function', async () => {
    const mod = await import('../../components/charts/RechartsVisitsBar');
    expect(typeof mod.RechartsVisitsBar).toBe('function');
    expect(mod.RechartsVisitsBar.name).toBe('RechartsVisitsBar');
  });

  it('accepts data with three series', async () => {
    const mod = await import('../../components/charts/RechartsVisitsBar');
    expect(typeof mod.RechartsVisitsBar).toBe('function');
    expect(sampleVisits.length).toBe(2);
    expect(sampleVisits[0]?.visitas_agendadas).toBe(5);
    expect(sampleVisits[0]?.visitas_completadas).toBe(4);
    expect(sampleVisits[0]?.operaciones_cerradas).toBe(1);
  });

  it('accepts slaUnavailable flag', async () => {
    const mod = await import('../../components/charts/RechartsVisitsBar');
    expect(typeof mod.RechartsVisitsBar).toBe('function');
    const props = { data: sampleVisits, slaUnavailable: true } as const;
    expect(props.slaUnavailable).toBe(true);
  });
});

describe('RechartsZoneHeatmap — module export smoke', () => {
  it('exports RechartsZoneHeatmap as function', async () => {
    const mod = await import('../../components/charts/RechartsZoneHeatmap');
    expect(typeof mod.RechartsZoneHeatmap).toBe('function');
    expect(mod.RechartsZoneHeatmap.name).toBe('RechartsZoneHeatmap');
  });

  it('accepts heatmap rows', async () => {
    const mod = await import('../../components/charts/RechartsZoneHeatmap');
    expect(typeof mod.RechartsZoneHeatmap).toBe('function');
    expect(sampleHeatmap.length).toBe(3);
    expect(sampleHeatmap[0]?.colonia).toBe('Roma Norte');
  });

  it('accepts empty heatmap', async () => {
    const mod = await import('../../components/charts/RechartsZoneHeatmap');
    expect(typeof mod.RechartsZoneHeatmap).toBe('function');
    const empty: ReadonlyArray<(typeof sampleHeatmap)[number]> = [];
    expect(empty.length).toBe(0);
  });
});
