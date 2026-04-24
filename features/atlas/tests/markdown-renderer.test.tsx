// Tests del pipeline react-markdown + remark-gfm + rehype-sanitize
// (ADR-028). Validan sanitización XSS + soporte GFM.

import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { WikiContentRenderer } from '../components/WikiContentRenderer';

interface ReactDomServerNode {
  readonly renderToStaticMarkup: (element: ReactElement) => string;
}

function renderMd(md: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-dom/server.node') as ReactDomServerNode;
  return mod.renderToStaticMarkup(<WikiContentRenderer contentMd={md} />);
}

describe('WikiContentRenderer — sanitize + GFM', () => {
  it('renders basic headings and bold', () => {
    const html = renderMd('# Hello\n\nWorld **bold**');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('blocks javascript: URIs in links', () => {
    const html = renderMd('[click](javascript:alert(1))');
    expect(html.toLowerCase()).not.toContain('javascript:');
  });

  it('strips <script> tags', () => {
    const html = renderMd('Hola <script>alert("x")</script>');
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('strips event handlers', () => {
    const html = renderMd('<img src="x" onerror="alert(1)" />');
    expect(html.toLowerCase()).not.toContain('onerror');
  });

  it('blocks iframe', () => {
    const html = renderMd('<iframe src="https://evil.example"></iframe>');
    expect(html.toLowerCase()).not.toContain('<iframe');
  });

  it('renders GFM tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = renderMd(md);
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('A');
    expect(html).toContain('<td');
  });

  it('renders GFM task lists', () => {
    const md = '- [x] done\n- [ ] pending';
    const html = renderMd(md);
    expect(html).toContain('type="checkbox"');
  });

  it('renders GFM strikethrough', () => {
    const html = renderMd('~~old~~ new');
    expect(html).toContain('<del>old</del>');
  });

  it('marks external links target=_blank + noopener', () => {
    const html = renderMd('[docs](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('internal anchors do not get target=_blank', () => {
    const html = renderMd('[faq](/faq)');
    expect(html).toContain('href="/faq"');
    expect(html).not.toContain('target="_blank"');
  });
});
