// F14.F.10 Sprint 9 SUB-AGENT 4 — Tests PortfolioVideoGrid (presentation pure).
// (Sin @testing-library/react: invoca el componente puro como función y atraviesa el árbol.)

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioVideoGridPresentation, type PortfolioVideoItem } from '../PortfolioVideoGrid';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

interface RenderedNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | null;
}

function collectStrings(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const c of node) collectStrings(c, out);
    return out;
  }
  if (typeof node === 'object') {
    const n = node as { props?: Record<string, unknown> };
    const children = n.props?.children;
    collectStrings(children, out);
  }
  return out;
}

function collectByTestId(node: unknown, testId: string, out: RenderedNode[] = []): RenderedNode[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const c of node) collectByTestId(c, testId, out);
    return out;
  }
  const n = node as RenderedNode;
  if (n.props?.['data-testid'] === testId) out.push(n);
  collectByTestId(n.props?.children, testId, out);
  return out;
}

function findByDataAttr(node: unknown, attr: string, value: string): RenderedNode | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const c of node) {
      const f = findByDataAttr(c, attr, value);
      if (f) return f;
    }
    return null;
  }
  const n = node as RenderedNode;
  if (n.props?.[attr] === value) return n;
  return findByDataAttr(n.props?.children, attr, value);
}

describe('PortfolioVideoGridPresentation', () => {
  it('renders empty state when no videos', () => {
    const result = PortfolioVideoGridPresentation({
      videos: [],
      activeVideo: null,
      onSelect: () => undefined,
      onClose: () => undefined,
    }) as unknown as ReactElement;
    const strings = collectStrings(result);
    expect(strings).toContain('Aún no hay videos publicados en este portfolio.');
    const emptyNode = findByDataAttr(result, 'data-empty-state', 'true');
    expect(emptyNode).not.toBeNull();
  });

  it('renders modal when activeVideo set + cards have onClick handlers (click → onSelect)', () => {
    const videos: ReadonlyArray<PortfolioVideoItem> = [
      {
        id: 'video-1',
        storageUrl: 'https://example.com/v1.mp4',
        thumbnailUrl: 'https://example.com/v1.jpg',
        projectId: null,
        createdAt: '2026-04-27T00:00:00Z',
      },
    ];

    let selected: PortfolioVideoItem | null = null;
    const result = PortfolioVideoGridPresentation({
      videos,
      activeVideo: null,
      onSelect: (v) => {
        selected = v;
      },
      onClose: () => undefined,
    }) as unknown as ReactElement;

    const cards = collectByTestId(result, 'portfolio-video-card');
    expect(cards.length).toBe(1);
    const firstCard = cards[0];
    if (!firstCard) throw new Error('card missing');
    expect(typeof firstCard.props.onClick).toBe('function');
    (firstCard.props.onClick as () => void)();
    expect(selected).not.toBeNull();
    expect((selected as unknown as PortfolioVideoItem).id).toBe('video-1');

    // With activeVideo set, modal renders.
    const withModal = PortfolioVideoGridPresentation({
      videos,
      activeVideo: videos[0] ?? null,
      onSelect: () => undefined,
      onClose: () => undefined,
    }) as unknown as ReactElement;
    const modal = collectByTestId(withModal, 'portfolio-video-modal');
    expect(modal.length).toBe(1);
  });
});
