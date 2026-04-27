// F14.F.5 Sprint 4 — BatchResultViewer tests (Modo A: smoke + 3 cards render).
// (No RTL render: project devDependencies do NOT include @testing-library/react;
// component split into hook-bound BatchResultViewer wrapper + pure
// BatchResultPresentation. Tests invoke the presentational component directly.)

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      batchMode: {
        getBatchProjects: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: unknown;
    href: string;
    [key: string]: unknown;
  }) => ({ type: 'a', props: { href, ...rest, children }, key: null }),
}));

interface RenderedNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | null;
}

function collectByTestIdPrefix(
  node: RenderedNode | null | undefined,
  prefix: string,
  out: RenderedNode[] = [],
): RenderedNode[] {
  if (!node || typeof node !== 'object') return out;
  const props = node.props ?? {};
  const id = props['data-testid'];
  if (typeof id === 'string' && id.startsWith(prefix)) out.push(node);
  const children = props.children as unknown;
  if (Array.isArray(children)) {
    for (const c of children) {
      collectByTestIdPrefix(c as RenderedNode | null, prefix, out);
    }
  } else if (children && typeof children === 'object') {
    collectByTestIdPrefix(children as RenderedNode, prefix, out);
  }
  return out;
}

function findByTestId(node: RenderedNode | null | undefined, id: string): RenderedNode | null {
  if (!node || typeof node !== 'object') return null;
  const props = node.props ?? {};
  if (props['data-testid'] === id) return node;
  const children = props.children as unknown;
  if (Array.isArray(children)) {
    for (const c of children) {
      const found = findByTestId(c as RenderedNode | null, id);
      if (found) return found;
    }
  } else if (children && typeof children === 'object') {
    return findByTestId(children as RenderedNode, id);
  }
  return null;
}

describe('BatchResultViewer — module export smoke', () => {
  it('exports BatchResultViewer + BatchResultPresentation as named functions', async () => {
    const mod = await import('@/features/dmx-studio/components/projects/BatchResultViewer');
    expect(typeof mod.BatchResultViewer).toBe('function');
    expect(typeof mod.BatchResultPresentation).toBe('function');
  });
});

describe('BatchResultPresentation — renders 3 cards per parent batch', () => {
  it('renders one card per child returned by data state', async () => {
    const { BatchResultPresentation } = await import(
      '@/features/dmx-studio/components/projects/BatchResultViewer'
    );

    const result = BatchResultPresentation({
      locale: 'es-MX',
      state: {
        kind: 'data',
        data: {
          parentProjectId: 'parent-1',
          parentTitle: 'Polanco PH',
          children: [
            {
              id: 'child-lujo',
              title: 'Polanco PH — Lujo',
              status: 'draft',
              batchVariant: 'lujo',
              batchPending: true,
              createdAt: '2026-04-27T10:00:00Z',
            },
            {
              id: 'child-familiar',
              title: 'Polanco PH — Familiar',
              status: 'draft',
              batchVariant: 'familiar',
              batchPending: true,
              createdAt: '2026-04-27T10:00:01Z',
            },
            {
              id: 'child-inv',
              title: 'Polanco PH — Inversionista',
              status: 'draft',
              batchVariant: 'inversionista',
              batchPending: true,
              createdAt: '2026-04-27T10:00:02Z',
            },
          ],
        },
      },
    }) as unknown as ReactElement;

    const root = result as unknown as RenderedNode;
    const viewer = findByTestId(root, 'batch-result-viewer');
    expect(viewer).not.toBeNull();

    const allCardElements = collectByTestIdPrefix(root, 'batch-card-');
    const cardRoots = allCardElements.filter((c) => {
      const id = c.props['data-testid'];
      return (
        typeof id === 'string' &&
        id.startsWith('batch-card-') &&
        !id.startsWith('batch-card-badge-') &&
        !id.startsWith('batch-card-link-')
      );
    });
    expect(cardRoots.length).toBe(3);

    const badges = collectByTestIdPrefix(root, 'batch-card-badge-');
    expect(badges.length).toBe(3);

    const lujoLink = findByTestId(root, 'batch-card-link-child-lujo');
    expect(lujoLink).not.toBeNull();
    expect(lujoLink?.props.href).toBe('/es-MX/studio-app/projects/child-lujo');
  });

  it('renders empty state for empty kind', async () => {
    const { BatchResultPresentation } = await import(
      '@/features/dmx-studio/components/projects/BatchResultViewer'
    );

    const result = BatchResultPresentation({
      locale: 'es-MX',
      state: { kind: 'empty' },
    }) as unknown as ReactElement;

    const empty = findByTestId(result as unknown as RenderedNode, 'batch-result-empty');
    expect(empty).not.toBeNull();
  });
});
