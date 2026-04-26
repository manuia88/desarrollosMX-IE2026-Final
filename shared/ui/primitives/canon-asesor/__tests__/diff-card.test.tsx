import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DiffCard } from '../diff-card';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('DiffCard', () => {
  it('renders before and after content', () => {
    const html = renderHtml(<DiffCard before="$1,200" after="$1,140" />);
    expect(html).toContain('$1,200');
    expect(html).toContain('$1,140');
  });

  it('before role marker present with line-through', () => {
    const html = renderHtml(<DiffCard before="A" after="B" />);
    expect(html).toContain('data-diff-role="before"');
    expect(html).toContain('line-through');
  });

  it('label and deltaLabel render when provided', () => {
    const html = renderHtml(<DiffCard before="100" after="80" label="Precio" deltaLabel="-20%" />);
    expect(html).toContain('Precio');
    expect(html).toContain('-20%');
  });
});
