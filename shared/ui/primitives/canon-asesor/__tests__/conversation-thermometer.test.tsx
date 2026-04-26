import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ConversationThermometer } from '../conversation-thermometer';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('ConversationThermometer', () => {
  it('aria-valuenow reflects temperature', () => {
    const html = renderHtml(<ConversationThermometer temperature={4} />);
    expect(html).toContain('aria-valuenow="4"');
    expect(html).toContain('aria-valuemax="5"');
  });

  it('renders 5 segments', () => {
    const html = renderHtml(<ConversationThermometer temperature={3} />);
    const segments = html.match(/aria-hidden="true"/g) ?? [];
    expect(segments.length).toBeGreaterThanOrEqual(5);
  });

  it('shows legend only when prop is true', () => {
    const without = renderHtml(<ConversationThermometer temperature={2} />);
    expect(without).not.toContain('Frío');
    const withLegend = renderHtml(<ConversationThermometer temperature={2} showLegend />);
    expect(withLegend).toContain('Frío');
    expect(withLegend).toContain('Caliente');
  });
});
