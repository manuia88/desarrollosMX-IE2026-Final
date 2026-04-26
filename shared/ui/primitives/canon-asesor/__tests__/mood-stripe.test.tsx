import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MoodStripe } from '../mood-stripe';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderHtml(element: ReactElement): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(element);
}

describe('MoodStripe', () => {
  it('always sets aria-hidden', () => {
    const html = renderHtml(<MoodStripe mood="high" />);
    expect(html).toContain('aria-hidden="true"');
  });

  it('data-mood attribute reflects prop', () => {
    const html = renderHtml(<MoodStripe mood="mixed" />);
    expect(html).toContain('data-mood="mixed"');
  });

  it('pulse=false disables animation', () => {
    const html = renderHtml(<MoodStripe mood="low" />);
    expect(html).toContain('animation:none');
  });

  it('pulse=true sets mood-pulse animation', () => {
    const html = renderHtml(<MoodStripe mood="neutral" pulse />);
    expect(html).toContain('mood-pulse');
  });
});
