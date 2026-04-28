import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

// Modo A — createCaller-style with createAdminClient mocked.
// Coverage: developer.listMyProjects, developer.getWeeklyHighlights, developer.siteSelectionAI.

type QueryShape = { data: unknown; error: unknown; count?: number | null };

interface FakeBuilder {
  // biome-ignore lint/suspicious/noExplicitAny: chained mock builder
  [k: string]: any;
}

function chain(result: QueryShape): FakeBuilder {
  // biome-ignore lint/suspicious/noExplicitAny: chained stub
  const c: any = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.gte = vi.fn(() => c);
  c.lte = vi.fn(() => c);
  c.is = vi.fn(() => c);
  c.not = vi.fn(() => c);
  c.or = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  c.insert = vi.fn(() => c);
  c.update = vi.fn(() => c);
  c.delete = vi.fn(() => c);
  // biome-ignore lint/suspicious/noThenProperty: supabase builder is thenable
  c.then = (resolve: (v: QueryShape) => unknown) => Promise.resolve(result).then(resolve);
  return c;
}

let tableRegistry: Record<string, QueryShape> = {};
let rpcResult: QueryShape = { data: [], error: null };

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => chain(tableRegistry[table] ?? { data: [], error: null }),
    rpc: vi.fn((fnName: string) => {
      if (fnName === 'resolve_features') return Promise.resolve(rpcResult);
      return Promise.resolve({ data: null, error: null });
    }),
  }),
}));

vi.mock('@/shared/lib/runtime-cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
}));

vi.mock('@/shared/lib/site-selection/site-selection-ai', () => ({
  runSiteSelectionAI: vi.fn(async () => ({
    parsedIntent: { raw: 'test' },
    zones: [
      {
        zoneId: null,
        colonia: 'Roma Norte',
        ciudad: 'CDMX',
        fitScore: 78,
        rationale: 'high momentum',
        lat: null,
        lng: null,
      },
    ],
    listings: [],
    narrative: 'narrative text',
    costUsd: 0,
    isPlaceholder: true,
  })),
}));

const DEV_USER_UUID = 'd1111111-1111-4111-8111-111111111111';
const DEV_DESARROLLADORA_UUID = 'a2222222-2222-4222-8222-222222222222';

function buildCtx(): Context {
  const supabase = {
    rpc: vi.fn(async (fnName: string) => {
      if (fnName === 'check_rate_limit_db') return { data: true, error: null };
      if (fnName === 'resolve_features') return rpcResult;
      return { data: null, error: null };
    }),
  };
  return {
    supabase,
    headers: new Headers(),
    user: { id: DEV_USER_UUID, email: 'dev@example.com' } as unknown as User,
    profile: { id: DEV_USER_UUID, rol: 'admin_desarrolladora' },
  } as unknown as Context;
}

beforeEach(() => {
  tableRegistry = {};
  rpcResult = { data: [], error: null };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('developer.listMyProjects', () => {
  it('returns empty array when desarrolladora_id is null', async () => {
    tableRegistry.profiles = {
      data: { id: DEV_USER_UUID, rol: 'admin_desarrolladora', desarrolladora_id: null },
      error: null,
    };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    const result = await caller.listMyProjects();
    expect(result).toEqual([]);
  });

  it('returns mapped projects when desarrolladora_id is set', async () => {
    tableRegistry.profiles = {
      data: {
        id: DEV_USER_UUID,
        rol: 'admin_desarrolladora',
        desarrolladora_id: DEV_DESARROLLADORA_UUID,
      },
      error: null,
    };
    tableRegistry.proyectos = {
      data: [
        {
          id: 'p1111111-1111-4111-8111-111111111111',
          nombre: 'Sky Towers',
          status: 'preventa',
          units_total: 80,
          units_available: 24,
        },
        {
          id: 'p2222222-2222-4222-8222-222222222222',
          nombre: 'Urban Loft',
          status: 'venta',
          units_total: null,
          units_available: null,
        },
      ],
      error: null,
    };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    const result = await caller.listMyProjects();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ nombre: 'Sky Towers', units_total: 80 });
    expect(result[1]).toMatchObject({ units_total: null, units_available: null });
  });

  it('throws FORBIDDEN when role is not in ALLOWED_DEV_ROLES', async () => {
    tableRegistry.profiles = {
      data: { id: DEV_USER_UUID, rol: 'asesor', desarrolladora_id: DEV_DESARROLLADORA_UUID },
      error: null,
    };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    await expect(caller.listMyProjects()).rejects.toThrow();
  });
});

describe('developer.getWeeklyHighlights', () => {
  it('returns empty when no proyectos found', async () => {
    tableRegistry.profiles = {
      data: {
        id: DEV_USER_UUID,
        rol: 'admin_desarrolladora',
        desarrolladora_id: DEV_DESARROLLADORA_UUID,
      },
      error: null,
    };
    tableRegistry.proyectos = { data: [], error: null };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    const result = await caller.getWeeklyHighlights();
    expect(result).toEqual([]);
  });

  it('returns top 5 highlights sorted by abs(trend_vs_previous)', async () => {
    tableRegistry.profiles = {
      data: {
        id: DEV_USER_UUID,
        rol: 'admin_desarrolladora',
        desarrolladora_id: DEV_DESARROLLADORA_UUID,
      },
      error: null,
    };
    const projectId = 'p1111111-1111-4111-8111-111111111111';
    tableRegistry.proyectos = {
      data: [{ id: projectId, nombre: 'Sky Towers' }],
      error: null,
    };
    tableRegistry.project_scores = {
      data: [
        {
          project_id: projectId,
          score_type: 'momentum',
          score_label: 'Momentum',
          score_value: 75,
          trend_direction: 'up',
          trend_vs_previous: 12.5,
          period_date: '2026-04-26',
        },
        {
          project_id: projectId,
          score_type: 'walkability',
          score_label: 'Walkability',
          score_value: 60,
          trend_direction: 'down',
          trend_vs_previous: -3.2,
          period_date: '2026-04-26',
        },
      ],
      error: null,
    };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    const result = await caller.getWeeklyHighlights();
    expect(result.length).toBeGreaterThan(0);
    expect(Math.abs(result[0]?.trend_vs_previous ?? 0)).toBeGreaterThanOrEqual(
      Math.abs(result[1]?.trend_vs_previous ?? 0),
    );
  });
});

describe('developer.siteSelectionAI', () => {
  it('rejects when desarrolladora_id is null (PRECONDITION_FAILED)', async () => {
    tableRegistry.profiles = {
      data: { id: DEV_USER_UUID, rol: 'admin_desarrolladora', desarrolladora_id: null },
      error: null,
    };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    await expect(
      caller.siteSelectionAI({ query: 'Quiero terreno CDMX norte 60 unidades' }),
    ).rejects.toThrow();
  });

  it('rejects when feature dev.api_access not present (FORBIDDEN)', async () => {
    tableRegistry.profiles = {
      data: {
        id: DEV_USER_UUID,
        rol: 'admin_desarrolladora',
        desarrolladora_id: DEV_DESARROLLADORA_UUID,
      },
      error: null,
    };
    rpcResult = { data: ['dev.projects_max'], error: null };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    await expect(
      caller.siteSelectionAI({ query: 'Quiero terreno CDMX norte 60 unidades' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('runs AI engine + persists row when dev.api_access granted', async () => {
    tableRegistry.profiles = {
      data: {
        id: DEV_USER_UUID,
        rol: 'admin_desarrolladora',
        desarrolladora_id: DEV_DESARROLLADORA_UUID,
      },
      error: null,
    };
    rpcResult = { data: ['dev.api_access'], error: null };
    tableRegistry.site_selection_queries = {
      data: { id: 'aaa11111-1111-4111-8111-111111111111' },
      error: null,
    };
    const { developerRouter } = await import('../routes/developer');
    const caller = developerRouter.createCaller(buildCtx());
    const result = await caller.siteSelectionAI({
      query: 'Quiero terreno CDMX norte 60 unidades residencial medio',
    });
    expect(result.queryId).toBeTruthy();
    expect(result.zones).toHaveLength(1);
    expect(result.isPlaceholder).toBe(true);
  });
});
