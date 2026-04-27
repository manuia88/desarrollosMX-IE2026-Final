import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('recharts', () => {
  const Passthrough = ({ children }: { readonly children?: React.ReactNode }) => children ?? null;
  const Empty = () => null;
  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Tooltip: Empty,
  };
});

import { DevKpiGrid } from '../components/DevKpiGrid';
import { InventorySnapshot } from '../components/InventorySnapshot';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function render(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('DevKpiGrid', () => {
  it('renders 5 KPI cards + section title with range', () => {
    const html = render(
      <DevKpiGrid
        kpis={{
          proyectos_activos: 4,
          unidades_vendidas: 12,
          revenue_mxn: 1500000,
          conversion_pct: 22.5,
          tickets_open: 3,
        }}
        rangeFrom="2026-04-01"
        rangeTo="2026-04-30"
      />,
    );
    expect(html).toContain('sectionTitle');
    expect(html).toContain('2026-04-01');
    expect(html).toContain('2026-04-30');
    expect(html).toContain('proyectosActivos');
    expect(html).toContain('unidadesVendidas');
    expect(html).toContain('revenueMxn');
    expect(html).toContain('conversionPct');
    expect(html).toContain('ticketsOpen');
    // Conversion percent is formatted with one decimal.
    expect(html).toContain('22.5%');
  });

  it('renders em-dash when conversion_pct is null', () => {
    const html = render(
      <DevKpiGrid
        kpis={{
          proyectos_activos: 0,
          unidades_vendidas: 0,
          revenue_mxn: 0,
          conversion_pct: null,
          tickets_open: 0,
        }}
        rangeFrom="2026-04-01"
        rangeTo="2026-04-30"
      />,
    );
    expect(html).toContain('—');
  });
});

describe('InventorySnapshot', () => {
  it('renders empty message when proyectos is empty', () => {
    const html = render(<InventorySnapshot proyectos={[]} />);
    expect(html).toContain('empty');
    expect(html).toContain('role="status"');
  });

  it('renders aria-label + sr-only data table caption with 2 proyectos', () => {
    const html = render(
      <InventorySnapshot
        proyectos={[
          {
            proyecto_id: 'p1',
            nombre: 'Torre Reforma',
            units_total: 50,
            disponible: 30,
            apartada: 10,
            vendida: 8,
            otra: 2,
          },
          {
            proyecto_id: 'p2',
            nombre: 'Polanco Heights',
            units_total: 40,
            disponible: 20,
            apartada: 5,
            vendida: 12,
            otra: 3,
          },
        ]}
      />,
    );
    expect(html).toContain('aria-label="aria"');
    expect(html).toContain('<caption>tableCaption</caption>');
    expect(html).toContain('Torre Reforma');
    expect(html).toContain('Polanco Heights');
  });
});
