import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ConfidenceHalo } from '../confidence-halo';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('ConfidenceHalo', () => {
  it('omits halo when confidence below 0.4', () => {
    const html = renderHtml(
      <ConfidenceHalo confidence={0.3}>
        <span>x</span>
      </ConfidenceHalo>,
    );
    expect(html).not.toContain('168, 85, 247');
  });

  it('applies violet glow when confidence ≥ 0.4', () => {
    const html = renderHtml(
      <ConfidenceHalo confidence={0.85}>
        <span>x</span>
      </ConfidenceHalo>,
    );
    expect(html).toContain('168, 85, 247');
  });

  it('preserves children intact', () => {
    const html = renderHtml(
      <ConfidenceHalo confidence={0.5}>
        <button type="button">child</button>
      </ConfidenceHalo>,
    );
    expect(html).toContain('child');
  });

  it('data-confidence attribute exposes value', () => {
    const html = renderHtml(
      <ConfidenceHalo confidence={0.72}>
        <span>x</span>
      </ConfidenceHalo>,
    );
    expect(html).toContain('data-confidence="0.72"');
  });
});
