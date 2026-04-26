import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { HeatmapDensity } from '../heatmap-density';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('HeatmapDensity', () => {
  it('renders rows × cols cells', () => {
    const values = Array.from({ length: 30 }, () => 0);
    const html = renderHtml(<HeatmapDensity values={values} ariaLabel="Test" rows={5} cols={6} />);
    const cells = html.match(/aspect-ratio:1 \/ 1/g) ?? [];
    expect(cells.length).toBe(30);
  });

  it('aria-label set on root', () => {
    const html = renderHtml(<HeatmapDensity values={[0]} ariaLabel="Heat" rows={1} cols={1} />);
    expect(html).toContain('aria-label="Heat"');
  });

  it('cellLabels populate title attribute', () => {
    const html = renderHtml(
      <HeatmapDensity
        values={[1, 2, 3]}
        rows={1}
        cols={3}
        cellLabels={['Lun', 'Mar', 'Mie']}
        ariaLabel="weekly"
      />,
    );
    expect(html).toContain('title="Lun"');
    expect(html).toContain('title="Mar"');
  });
});
