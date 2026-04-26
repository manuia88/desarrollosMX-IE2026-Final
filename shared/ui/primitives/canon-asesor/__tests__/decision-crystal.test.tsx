import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { DecisionCrystal } from '../decision-crystal';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('DecisionCrystal', () => {
  it('renders three bars', () => {
    const html = renderHtml(<DecisionCrystal metrics={[100, 50, 25]} />);
    const titleMatches = html.match(/title="/g) ?? [];
    expect(titleMatches.length).toBe(3);
  });

  it('aria-label enumerates labels and values', () => {
    const html = renderHtml(
      <DecisionCrystal metrics={[60, 80, 45]} labels={['Precio', 'Tiempo', 'Calidad']} />,
    );
    expect(html).toContain('Precio 60');
    expect(html).toContain('Tiempo 80');
    expect(html).toContain('Calidad 45');
  });

  it('size variant applies data attribute', () => {
    const html = renderHtml(<DecisionCrystal metrics={[1, 2, 3]} size="lg" />);
    expect(html).toContain('data-size="lg"');
  });

  it('reduceMotion=true omits animation', () => {
    const html = renderHtml(<DecisionCrystal metrics={[1, 2, 3]} reduceMotion />);
    expect(html).not.toContain('animation:bar-grow');
  });

  it('default size is md', () => {
    const html = renderHtml(<DecisionCrystal metrics={[10, 20, 30]} />);
    expect(html).toContain('data-size="md"');
  });

  it('aria-label format includes default labels', () => {
    const html = renderHtml(<DecisionCrystal metrics={[10, 20, 30]} />);
    expect(html).toContain('aria-label="A 10, B 20, C 30"');
  });
});
