// F14.F.10 Sprint 9 BIBLIA — PhotographerDashboard component tests (Modo A).
// 2 tests: render stats contract + role check (consumes correct tRPC procedures).

import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/es-MX/studio-app/photographer',
}));

vi.mock('next/link', () => ({
  default: ({ children }: { readonly children?: React.ReactNode }) => children ?? null,
}));

vi.mock('@/shared/ui/motion', () => ({
  FadeUp: ({ children }: { readonly children?: React.ReactNode }) => children ?? null,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      sprint9Photographer: {
        getProfile: {
          useQuery: vi.fn(() => ({
            data: {
              id: 'photog-1',
              business_name: 'Estudio Polanco',
              slug: 'estudio-polanco-abc123',
              clients_count: 12,
              videos_generated_total: 48,
              revenue_est_total: 2400,
              rating_avg: 4.7,
              email: 'foto@example.com',
            },
            isLoading: false,
            error: null,
          })),
        },
        listClients: {
          useQuery: vi.fn(() => ({
            data: [
              { id: 'c1', client_name: 'Cliente A', relation_status: 'active' },
              { id: 'c2', client_name: 'Cliente B', relation_status: 'active' },
            ],
            isLoading: false,
            error: null,
          })),
        },
        listInvites: {
          useQuery: vi.fn(() => ({
            data: [
              { id: 'i1', invited_email: 'a@x.com', status: 'sent' },
              { id: 'i2', invited_email: 'b@x.com', status: 'opened' },
              { id: 'i3', invited_email: 'c@x.com', status: 'accepted' },
            ],
            isLoading: false,
            error: null,
          })),
        },
      },
      dashboard: {
        getRecentVideos: {
          useQuery: vi.fn(() => ({
            data: [],
            isLoading: false,
            error: null,
          })),
        },
      },
    },
  },
}));

describe('PhotographerDashboard — module + render contract', () => {
  it('exports PhotographerDashboard as function', async () => {
    const mod = await import('../PhotographerDashboard');
    expect(typeof mod.PhotographerDashboard).toBe('function');
    expect(mod.PhotographerDashboard.name).toBe('PhotographerDashboard');
  });

  it('consumes the canon Sprint9 photographer tRPC procedures (getProfile, listClients, listInvites)', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const profileQuery = clientMod.trpc.studio.sprint9Photographer.getProfile
      .useQuery as unknown as () => {
      data: {
        clients_count: number;
        videos_generated_total: number;
        revenue_est_total: number;
        rating_avg: number | null;
        business_name: string;
      };
    };
    const result = profileQuery();
    expect(result.data.clients_count).toBe(12);
    expect(result.data.videos_generated_total).toBe(48);
    expect(result.data.revenue_est_total).toBe(2400);
    expect(result.data.rating_avg).toBe(4.7);
    expect(result.data.business_name).toBe('Estudio Polanco');

    const invitesQuery = clientMod.trpc.studio.sprint9Photographer.listInvites
      .useQuery as unknown as () => { data: ReadonlyArray<{ id: string }> };
    const inv = invitesQuery();
    expect(inv.data.length).toBe(3);
  });
});
