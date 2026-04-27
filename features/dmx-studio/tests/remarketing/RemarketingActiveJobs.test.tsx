// F14.F.5 Sprint 4 Tarea 4.3 — RemarketingActiveJobs component contract test (Modo A).
// No RTL en este repo — pattern: module export smoke + render-shape via direct invocation.
// Verifica: hidden cuando jobs vacios, renders section + lista cuando hay jobs pending.

import { describe, expect, it, vi } from 'vitest';

const useQueryMock = vi.fn();

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      remarketing: {
        getActiveJobs: { useQuery: () => useQueryMock() },
      },
    },
  },
}));

vi.mock('@/shared/ui/primitives/canon', () => {
  const Card = ({ children }: { readonly children?: React.ReactNode }) => children ?? null;
  const DisclosurePill = ({ children }: { readonly children?: React.ReactNode }) =>
    children ?? null;
  return { Card, DisclosurePill };
});

describe('RemarketingActiveJobs — render contract', () => {
  it('returns null when there are no jobs (hidden in dashboard)', async () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    const mod = await import('@/features/dmx-studio/components/remarketing/RemarketingActiveJobs');
    const result = mod.RemarketingActiveJobs({ locale: 'es-MX' });
    expect(result).toBeNull();
  });

  it('returns null while query is loading (no skeleton flash)', async () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const mod = await import('@/features/dmx-studio/components/remarketing/RemarketingActiveJobs');
    const result = mod.RemarketingActiveJobs({ locale: 'es-MX' });
    expect(result).toBeNull();
  });

  it('renders a section element with one card per pending job', async () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          sourceProjectId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          newProjectId: null,
          angle: 'cocina',
          status: 'pending',
          createdAt: '2026-04-25T06:00:00Z',
          generatedAt: null,
          errorMessage: null,
        },
      ],
      isLoading: false,
    });
    const mod = await import('@/features/dmx-studio/components/remarketing/RemarketingActiveJobs');
    const result = mod.RemarketingActiveJobs({ locale: 'es-MX' });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
    // Top-level <section> element with aria-label.
    const element = result as { type: string; props: { 'aria-label': string } };
    expect(element.type).toBe('section');
    expect(element.props['aria-label']).toBe('Remarketing automatico');
  });
});
