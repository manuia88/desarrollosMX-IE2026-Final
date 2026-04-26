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

const { loadContactos } = await import('../lib/contactos-loader');
const { filtersSchema } = await import('../schemas/filter-schemas');

beforeEach(() => {
  tableResultsHolder.current.clear();
  tableResultsHolder.callIndex.clear();
});

function setTableResults(table: string, results: MockResult[]) {
  tableResultsHolder.current.set(table, results);
}

describe('loadContactos', () => {
  it('returns isStub=true when BD has zero leads', async () => {
    setTableResults('leads', [
      { data: [], error: null, count: 0 },
      { data: [], error: null, count: 0 },
      { data: [], error: null, count: 0 },
      { data: [], error: null, count: 0 },
    ]);

    const filters = filtersSchema.parse({ tab: 'all' });
    const result = await loadContactos(filters, 'asesor-1');
    expect(result.contactos).toEqual([]);
    expect(result.tabCounts.all).toBe(0);
    expect(result.isStub).toBe(true);
    expect(result.reason).toMatch(/BD sin contactos/i);
  });

  it('handles missing asesorId on tab=mine', async () => {
    setTableResults('leads', [
      { data: [], error: null, count: 0 },
      { data: [], error: null, count: 0 },
      { data: [], error: null, count: 0 },
    ]);

    const filters = filtersSchema.parse({ tab: 'mine' });
    const result = await loadContactos(filters, null);
    expect(result.asesorId).toBeNull();
    expect(result.contactos).toEqual([]);
  });

  it('maps lead row to ContactoSummary with normalized status + DISC null', async () => {
    const leadRow = {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: null,
      zone_id: '00000000-0000-4000-8000-000000000010',
      source_id: '00000000-0000-4000-8000-000000000011',
      country_code: 'MX',
      status: 'qualified',
      contact_name: 'Juan Pérez',
      contact_email: 'juan@example.com',
      contact_phone: '+52 55 1234 5678',
      assigned_asesor_id: 'asesor-1',
      brokerage_id: null,
      qualification_score: 75,
      notes: null,
      metadata: {},
      created_at: '2026-04-25T10:00:00Z',
      updated_at: '2026-04-26T10:00:00Z',
    };

    setTableResults('leads', [
      { data: [leadRow], error: null },
      { data: [], error: null, count: 1 },
      { data: [], error: null, count: 1 },
      { data: [], error: null, count: 1 },
    ]);
    setTableResults('buyer_twins', [{ data: [], error: null }]);
    setTableResults('family_unit_members', [{ data: [], error: null }]);

    const filters = filtersSchema.parse({ tab: 'mine' });
    const result = await loadContactos(filters, 'asesor-1');

    expect(result.contactos).toHaveLength(1);
    const contacto = result.contactos[0];
    expect(contacto?.contactName).toBe('Juan Pérez');
    expect(contacto?.status).toBe('qualified');
    expect(contacto?.disc).toBeNull();
    expect(contacto?.hasFamilyUnit).toBe(false);
    expect(result.statusCounts.qualified).toBe(1);
  });

  it('parses birthdayInDays from metadata.fecha_nacimiento', async () => {
    const target = new Date();
    target.setDate(target.getDate() + 7);
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const leadRow = {
      id: '00000000-0000-4000-8000-000000000002',
      user_id: null,
      zone_id: '00000000-0000-4000-8000-000000000010',
      source_id: '00000000-0000-4000-8000-000000000011',
      country_code: 'MX',
      status: 'new',
      contact_name: 'Ana García',
      contact_email: null,
      contact_phone: null,
      assigned_asesor_id: 'asesor-1',
      brokerage_id: null,
      qualification_score: 50,
      notes: null,
      metadata: { fecha_nacimiento: `1990-${month}-${day}` },
      created_at: '2026-04-20T10:00:00Z',
      updated_at: '2026-04-20T10:00:00Z',
    };

    setTableResults('leads', [
      { data: [leadRow], error: null },
      { data: [], error: null, count: 1 },
      { data: [], error: null, count: 1 },
      { data: [], error: null, count: 1 },
    ]);
    setTableResults('buyer_twins', [{ data: [], error: null }]);
    setTableResults('family_unit_members', [{ data: [], error: null }]);

    const filters = filtersSchema.parse({ tab: 'all' });
    const result = await loadContactos(filters, 'asesor-1');
    expect(result.contactos[0]?.birthdayInDays).not.toBeNull();
    expect(result.contactos[0]?.birthdayInDays).toBeLessThanOrEqual(30);
  });
});
