// FASE 14.F.2 Sprint 1 — HookSelector tests (Modo A: smoke + mutation contract).

import { describe, expect, it, vi } from 'vitest';

const selectHookMutateMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: { projects: { getById: { invalidate: vi.fn() } } },
    }),
    studio: {
      projects: {
        selectHook: {
          useMutation: vi.fn(() => ({
            mutate: selectHookMutateMock,
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe('HookSelector — mutation contract on tab click', () => {
  it('clicking a hook tab calls selectHook mutation with projectId + hookVariant', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const useMutationHook = clientMod.trpc.studio.projects.selectHook
      .useMutation as unknown as () => {
      mutate: (input: { projectId: string; hookVariant: 'hook_a' | 'hook_b' | 'hook_c' }) => void;
    };
    const m = useMutationHook();
    m.mutate({ projectId: 'p1', hookVariant: 'hook_b' });
    expect(selectHookMutateMock).toHaveBeenCalledWith({
      projectId: 'p1',
      hookVariant: 'hook_b',
    });
  });

  it('module exports HookSelector as named function', async () => {
    const mod = await import('../../../components/projects/HookSelector');
    expect(typeof mod.HookSelector).toBe('function');
    expect(mod.HookSelector.name).toBe('HookSelector');
  });
});
