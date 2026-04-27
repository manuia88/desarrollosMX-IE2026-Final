// F14.F.5 Sprint 4 — BatchModeButton tests (Modo A: smoke + plan gating).
// (No RTL render: project devDependencies do NOT include @testing-library/react;
// component split into pure UpgradeNotice + hook-using ActiveButton — wrapper
// chooses between them. We invoke wrapper directly without hooks for upgrade
// path; for agency path we verify the wrapper returns the active sub-component.)

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mutateAsyncMock = vi.fn(async () => ({
  ok: true,
  parentProjectId: 'parent-id',
  batchProjectIds: ['c1', 'c2', 'c3'],
  count: 3,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      batchMode: {
        createBatch: {
          useMutation: vi.fn(() => ({
            mutateAsync: mutateAsyncMock,
            isPending: false,
          })),
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

function findChildByTestId(node: RenderedNode | null, id: string): RenderedNode | null {
  if (!node || typeof node !== 'object') return null;
  const props = node.props ?? {};
  if (props['data-testid'] === id) return node;
  const children = props.children as unknown;
  if (Array.isArray(children)) {
    for (const c of children) {
      const found = findChildByTestId(c as RenderedNode | null, id);
      if (found) return found;
    }
  } else if (children && typeof children === 'object') {
    return findChildByTestId(children as RenderedNode, id);
  }
  return null;
}

describe('BatchModeButton — module export smoke', () => {
  it('exports BatchModeButton + sub-components as named functions', async () => {
    const mod = await import('@/features/dmx-studio/components/projects/BatchModeButton');
    expect(typeof mod.BatchModeButton).toBe('function');
    expect(typeof mod.BatchModeUpgradeNotice).toBe('function');
    expect(typeof mod.BatchModeActiveButton).toBe('function');
  });
});

describe('BatchModeButton — plan gating', () => {
  it('returns BatchModeUpgradeNotice subtree when currentPlan != agency', async () => {
    const { BatchModeButton, BatchModeUpgradeNotice, BatchModeActiveButton } = await import(
      '@/features/dmx-studio/components/projects/BatchModeButton'
    );

    const result = BatchModeButton({
      projectId: 'p1',
      currentPlan: 'pro',
      locale: 'es-MX',
    }) as unknown as ReactElement;

    expect(result.type).toBe(BatchModeUpgradeNotice);
    expect(result.type).not.toBe(BatchModeActiveButton);

    // Verify rendered subtree of UpgradeNotice (no hooks in this component).
    const noticeRendered = BatchModeUpgradeNotice({
      locale: 'es-MX',
    }) as unknown as RenderedNode;
    const upgradeBox = findChildByTestId(noticeRendered, 'batch-mode-upgrade');
    expect(upgradeBox).not.toBeNull();

    const upgradeLink = findChildByTestId(noticeRendered, 'batch-mode-upgrade-link');
    expect(upgradeLink).not.toBeNull();
    expect(upgradeLink?.props.href).toBe('/es-MX/studio/precios');
  });

  it('returns BatchModeActiveButton subtree when currentPlan = agency', async () => {
    const { BatchModeButton, BatchModeUpgradeNotice, BatchModeActiveButton } = await import(
      '@/features/dmx-studio/components/projects/BatchModeButton'
    );

    const result = BatchModeButton({
      projectId: 'p1',
      currentPlan: 'agency',
      locale: 'es-MX',
    }) as unknown as ReactElement;

    expect(result.type).toBe(BatchModeActiveButton);
    expect(result.type).not.toBe(BatchModeUpgradeNotice);
    expect((result.props as { projectId: string }).projectId).toBe('p1');
  });

  it('returns BatchModeUpgradeNotice when currentPlan is null', async () => {
    const { BatchModeButton, BatchModeUpgradeNotice } = await import(
      '@/features/dmx-studio/components/projects/BatchModeButton'
    );

    const result = BatchModeButton({
      projectId: 'p1',
      currentPlan: null,
      locale: 'es-MX',
    }) as unknown as ReactElement;

    expect(result.type).toBe(BatchModeUpgradeNotice);
  });
});
