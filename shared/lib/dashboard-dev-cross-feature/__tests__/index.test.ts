import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { getActiveSeriesForDeveloper, shouldShowStudioWidget } from '../index';

function makeBuilder(result: { data: unknown; count?: number }) {
  const proxy: Record<string, unknown> = {};
  const chain = () => proxy;
  proxy.select = chain;
  proxy.eq = chain;
  proxy.in = chain;
  proxy.order = chain;
  proxy.limit = chain;
  proxy.maybeSingle = async () =>
    Array.isArray(result.data)
      ? { data: result.data[0] ?? null, error: null }
      : { data: result.data, error: null };
  // biome-ignore lint/suspicious/noThenProperty: chainable Supabase mock
  proxy.then = (resolve: (v: unknown) => void) =>
    resolve({ data: result.data, count: result.count, error: null });
  return proxy;
}

function mock(tables: Record<string, { data: unknown; count?: number }>) {
  vi.mocked(createAdminClient).mockReturnValue({
    from: (t: string) => makeBuilder(tables[t] ?? { data: null }),
  } as unknown as ReturnType<typeof createAdminClient>);
}

describe('dashboard-dev-cross-feature ADR-056', () => {
  it('getActiveSeriesForDeveloper devuelve null cuando no hay serie', async () => {
    mock({ studio_series_projects: { data: null } });
    const r = await getActiveSeriesForDeveloper('user-1');
    expect(r).toBeNull();
  });

  it('getActiveSeriesForDeveloper computa nextEpisode + counts correctamente', async () => {
    mock({
      studio_series_projects: {
        data: {
          id: 's-1',
          title: 'Torre Reforma Documental',
          episodes_count: 5,
          status: 'in_production',
          desarrollo_id: 'p-1',
          auto_progress_enabled: true,
          episode_project_ids: [],
          updated_at: '2026-04-27T00:00:00Z',
        },
      },
      studio_series_episodes: {
        data: [
          { episode_number: 1, title: 'Cap 1', status: 'published' },
          { episode_number: 2, title: 'Cap 2', status: 'published' },
          { episode_number: 3, title: 'Cap 3', status: 'pending' },
          { episode_number: 4, title: 'Cap 4', status: 'pending' },
          { episode_number: 5, title: 'Cap 5', status: 'pending' },
        ],
      },
      proyectos: { data: { nombre: 'Torre Reforma' } },
    });
    const r = await getActiveSeriesForDeveloper('user-1');
    expect(r?.title).toBe('Torre Reforma Documental');
    expect(r?.publishedEpisodes).toBe(2);
    expect(r?.totalEpisodes).toBe(5);
    expect(r?.nextEpisodeNumber).toBe(3);
    expect(r?.nextEpisodeTitle).toBe('Cap 3');
    expect(r?.desarrolloNombre).toBe('Torre Reforma');
    expect(r?.autoProgressEnabled).toBe(true);
  });

  it('shouldShowStudioWidget true cuando count > 0', async () => {
    mock({ studio_series_projects: { data: null, count: 1 } });
    const r = await shouldShowStudioWidget('user-1');
    expect(r).toBe(true);
  });

  it('shouldShowStudioWidget false cuando count == 0', async () => {
    mock({ studio_series_projects: { data: null, count: 0 } });
    const r = await shouldShowStudioWidget('user-1');
    expect(r).toBe(false);
  });
});
