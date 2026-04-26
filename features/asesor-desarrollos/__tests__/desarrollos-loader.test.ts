import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

interface MockResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

const tableResultsHolder = vi.hoisted(() => ({
  current: new Map<string, MockResult[]>(),
  callIndex: new Map<string, number>(),
}));

function createChainProxy(table: string): unknown {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        const queue = tableResultsHolder.current.get(table) ?? [];
        const idx = tableResultsHolder.callIndex.get(table) ?? 0;
        const result = queue[idx] ?? { data: [], error: null, count: 0 };
        tableResultsHolder.callIndex.set(table, idx + 1);
        return (resolve: (value: MockResult) => unknown) => Promise.resolve(resolve(result));
      }
      if (prop === Symbol.toPrimitive) return undefined;
      return () => proxy;
    },
  };
  const proxy: unknown = new Proxy({}, handler);
  return proxy;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => createChainProxy(table),
  })),
}));

const { loadDesarrollos } = await import('../lib/desarrollos-loader');
const { filtersSchema } = await import('../lib/filter-schemas');

beforeEach(() => {
  tableResultsHolder.current.clear();
  tableResultsHolder.callIndex.clear();
});

function setTableResults(table: string, results: MockResult[]) {
  tableResultsHolder.current.set(table, results);
}

describe('loadDesarrollos (real datasource)', () => {
  it('returns isStub=true with reason when BD has zero proyectos', async () => {
    setTableResults('proyectos', [
      { count: 0, data: null, error: null },
      { count: 0, data: null, error: null },
      { data: [], error: null },
    ]);
    setTableResults('project_brokers', [{ data: [], error: null }]);

    const filters = filtersSchema.parse({ tab: 'dmx' });
    const result = await loadDesarrollos(filters, 'asesor-id-1');

    expect(result.projects).toEqual([]);
    expect(result.tabCounts).toEqual({ own: 0, exclusive: 0, dmx: 0, mls: 0 });
    expect(result.nextCursor).toBeNull();
    expect(result.asesorId).toBe('asesor-id-1');
    expect(result.isStub).toBe(true);
    expect(result.reason).toMatch(/BD vacía/i);
  });

  it('returns empty for tab=own when asesorId is null', async () => {
    setTableResults('proyectos', [
      { count: 0, data: null, error: null },
      { count: 0, data: null, error: null },
    ]);

    const filters = filtersSchema.parse({ tab: 'own' });
    const result = await loadDesarrollos(filters, null);

    expect(result.projects).toEqual([]);
    expect(result.asesorId).toBeNull();
  });

  it('preserves asesorId for downstream consumers', async () => {
    setTableResults('proyectos', [
      { count: 5, data: null, error: null },
      { count: 5, data: null, error: null },
      { data: [], error: null },
    ]);
    setTableResults('project_brokers', [{ data: [], error: null }]);

    const filters = filtersSchema.parse({ tab: 'dmx' });
    const result = await loadDesarrollos(filters, 'user-abc');
    expect(result.asesorId).toBe('user-abc');
    expect(result.tabCounts.dmx).toBe(5);
    expect(result.tabCounts.mls).toBe(5);
  });

  it('maps proyecto rows to DesarrolloSummary shape with real boundary source', async () => {
    const proyectoRow = {
      id: '00000000-0000-4000-8000-000000000001',
      nombre: 'Torre Reforma',
      slug: 'torre-reforma',
      desarrolladora_id: 'd0000000-0000-4000-8000-000000000001',
      ciudad: 'CDMX',
      colonia: 'Cuauhtémoc',
      country_code: 'MX',
      tipo: 'departamento',
      operacion: 'venta',
      status: 'preventa',
      units_total: 200,
      units_available: 120,
      price_min_mxn: 5_000_000,
      price_max_mxn: 12_000_000,
      currency: 'MXN',
      bedrooms_range: [1, 3],
      amenities: ['alberca', 'gym'],
      cover_photo_url: null,
      privacy_level: 'public',
      is_active: true,
      updated_at: '2026-04-26T18:00:00Z',
    };
    setTableResults('proyectos', [
      { count: 1, data: null, error: null },
      { count: 1, data: null, error: null },
      { data: [proyectoRow], error: null },
    ]);
    setTableResults('project_brokers', [{ data: [], error: null }]);
    setTableResults('desarrolladoras', [
      { data: [{ id: 'd0000000-0000-4000-8000-000000000001', name: 'Mitikah Corp' }], error: null },
    ]);
    setTableResults('exclusividad_acuerdos', [{ data: [], error: null }]);

    const filters = filtersSchema.parse({ tab: 'dmx' });
    const result = await loadDesarrollos(filters, null);

    expect(result.projects).toHaveLength(1);
    const project = result.projects[0];
    expect(project).toBeDefined();
    expect(project?.name).toBe('Torre Reforma');
    expect(project?.desarrolladoraName).toBe('Mitikah Corp');
    expect(project?.amenities).toEqual(['alberca', 'gym']);
    expect(project?.boundarySource).toBe('real');
    expect(project?.isPlaceholder).toBe(false);
    expect(result.isStub).toBe(false);
    expect(result.reason).toBeNull();
  });
});
