import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  getDesarrolloAssets,
  getDesarrolloDetails,
  getDesarrolloProgress,
  hasMinimumPhotosForSeries,
} from '../index';

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

describe('desarrollos-cross-feature ADR-056', () => {
  it('getDesarrolloDetails mapea proyectos row a shape canon', async () => {
    mock({
      proyectos: {
        data: {
          id: 'p-1',
          nombre: 'Torre Reforma',
          desarrolladora_id: 'd-1',
          status: 'en_construccion',
          ciudad: 'CDMX',
          colonia: 'Roma Norte',
        },
      },
    });
    const r = await getDesarrolloDetails('p-1');
    expect(r?.nombre).toBe('Torre Reforma');
    expect(r?.statusComercial).toBe('en_construccion');
    expect(r?.colonia).toBe('Roma Norte');
  });

  it('getDesarrolloDetails returns null cuando no hay row', async () => {
    mock({ proyectos: { data: null } });
    const r = await getDesarrolloDetails('p-x');
    expect(r).toBeNull();
  });

  it('getDesarrolloAssets combina photos + marketing_assets', async () => {
    mock({
      photos: {
        data: [
          {
            id: 'ph-1',
            storage_path: 'photos/a.jpg',
            category: 'cocina',
            created_at: '2026-01-01',
          },
        ],
      },
      marketing_assets: {
        data: [
          {
            id: 'ma-1',
            url: 'https://x/y.png',
            asset_type: 'postCuadrado',
            created_at: '2026-01-02',
          },
        ],
      },
    });
    const r = await getDesarrolloAssets('p-1');
    expect(r.length).toBe(2);
    expect(r[0]?.assetType).toBe('photo');
    expect(r[0]?.etapa).toBe('acabados');
    expect(r[1]?.assetType).toBe('postCuadrado');
  });

  it('getDesarrolloProgress lee meta.progress', async () => {
    mock({
      proyectos: {
        data: {
          meta: { progress: { pct_completed: 35, current_phase: 'construccion' } },
          updated_at: '2026-04-27T00:00:00Z',
          status: 'en_construccion',
        },
      },
    });
    const r = await getDesarrolloProgress('p-1');
    expect(r.pctCompleted).toBe(35);
    expect(r.currentPhase).toBe('construccion');
  });

  it('getDesarrolloProgress fallback a status cuando meta.progress missing', async () => {
    mock({
      proyectos: {
        data: { meta: {}, updated_at: '2026-04-27T00:00:00Z', status: 'preventa' },
      },
    });
    const r = await getDesarrolloProgress('p-1');
    expect(r.pctCompleted).toBeNull();
    expect(r.currentPhase).toBe('planificacion');
  });

  it('hasMinimumPhotosForSeries true cuando count >= threshold', async () => {
    mock({ photos: { data: null, count: 8 } });
    const r = await hasMinimumPhotosForSeries('p-1', 5);
    expect(r).toBe(true);
  });

  it('hasMinimumPhotosForSeries false cuando count < threshold', async () => {
    mock({ photos: { data: null, count: 3 } });
    const r = await hasMinimumPhotosForSeries('p-1', 5);
    expect(r).toBe(false);
  });
});
