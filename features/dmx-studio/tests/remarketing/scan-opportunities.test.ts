// F14.F.5 Sprint 4 Tarea 4.3 — scanForRemarketingOpportunities tests (Modo A).
// Mock harness: per-table builder responses. Verifica:
//   1) skip projects con rendered_at < 14d (filter aplicado pre-fetch via .lt())
//   2) dedup: si hay job created_at > cooldown -> skip insert
//   3) insert job correct angle (rotation siguiente al ultimo).
// triggerPipeline mocked stub — NO consume credits API real (R16).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- mock harness for createAdminClient ---------------------------------------

interface RecordedInsert {
  table: string;
  payload: unknown;
}

interface RecordedFilter {
  op: 'eq' | 'in' | 'lt' | 'gte' | 'order' | 'limit';
  args: ReadonlyArray<unknown>;
}

interface RecordedSelect {
  table: string;
  cols: string;
  filters: RecordedFilter[];
}

interface AdminMockRegistry {
  inserts: RecordedInsert[];
  selects: RecordedSelect[];
  // Per-table queue: each list-select returns first dequeued response.
  selectByTable: Record<string, Array<{ data: unknown[]; error: unknown }>>;
  insertReturnByTable: Record<string, { data: unknown; error: unknown }>;
}

let registry: AdminMockRegistry = {
  inserts: [],
  selects: [],
  selectByTable: {},
  insertReturnByTable: {},
};

function resetRegistry() {
  registry = {
    inserts: [],
    selects: [],
    selectByTable: {},
    insertReturnByTable: {},
  };
}

function popSelect(table: string): { data: unknown[]; error: unknown } {
  const queue = registry.selectByTable[table];
  if (!queue || queue.length === 0) {
    return { data: [], error: null };
  }
  const next = queue.shift();
  return next ?? { data: [], error: null };
}

function buildAdminClient() {
  return {
    from(table: string) {
      const filters: RecordedFilter[] = [];

      const selectChain = (cols: string) => {
        registry.selects.push({ table, cols, filters });
        const builder: Record<string, unknown> = {};
        const passWithFilter = (op: RecordedFilter['op']) => {
          return (...args: unknown[]) => {
            filters.push({ op, args });
            return builder;
          };
        };
        builder.eq = passWithFilter('eq');
        builder.in = passWithFilter('in');
        builder.lt = passWithFilter('lt');
        builder.gte = passWithFilter('gte');
        builder.order = passWithFilter('order');
        builder.limit = passWithFilter('limit');
        builder.maybeSingle = async () => {
          const r = popSelect(table);
          return { data: r.data[0] ?? null, error: r.error };
        };
        builder.single = async () => {
          const r = popSelect(table);
          return { data: r.data[0] ?? null, error: r.error };
        };
        // biome-ignore lint/suspicious/noThenProperty: thenable mock matches supabase shape
        builder.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
          resolve(popSelect(table));
        };
        return builder;
      };

      const insertChain = (payload: unknown) => {
        registry.inserts.push({ table, payload });
        const builder: Record<string, unknown> = {};
        builder.select = (_cols?: string) => {
          const inner: Record<string, unknown> = {};
          inner.single = async () => {
            const r = registry.insertReturnByTable[table];
            return r ?? { data: null, error: null };
          };
          return inner;
        };
        // biome-ignore lint/suspicious/noThenProperty: thenable mock matches supabase shape
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          resolve({ error: null });
        };
        return builder;
      };

      return { select: selectChain, insert: insertChain };
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

// Mock pipeline kickoff — R16: never call real API.
const triggerPipelineMock = vi.fn(async () => ({ ok: true }));
vi.mock('@/features/dmx-studio/lib/pipeline', () => ({
  kickoffVideoPipeline: triggerPipelineMock,
}));

// --- helpers ------------------------------------------------------------------

const NOW_MS = new Date('2026-04-27T06:00:00Z').getTime();
const ACTIVE_USER_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_RENDERED_OLD_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_RENDERED_FRESH_ID = '33333333-3333-4333-8333-333333333333';
const PROJECT_RECENT_REMARKETED_ID = '44444444-4444-4444-8444-444444444444';
const NEW_JOB_ID = '55555555-5555-4555-8555-555555555555';

function isoDaysAgo(days: number): string {
  return new Date(NOW_MS - days * 86_400_000).toISOString();
}

beforeEach(() => {
  resetRegistry();
  triggerPipelineMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// --- tests --------------------------------------------------------------------

describe('scanForRemarketingOpportunities — candidate filtering', () => {
  it('skips projects with rendered_at < 14d (filter sent to supabase via .lt())', async () => {
    // Active user.
    registry.selectByTable.studio_subscriptions = [
      { data: [{ user_id: ACTIVE_USER_ID, status: 'active' }], error: null },
    ];
    // Candidate fetch: only old project returned (db filter applied).
    registry.selectByTable.studio_video_projects = [
      {
        data: [
          {
            id: PROJECT_RENDERED_OLD_ID,
            user_id: ACTIVE_USER_ID,
            title: 'Polanco PH',
            status: 'rendered',
            rendered_at: isoDaysAgo(20),
          },
        ],
        error: null,
      },
    ];
    // No recent remarketing jobs.
    registry.selectByTable.studio_remarketing_jobs = [
      { data: [], error: null }, // fetchRecentJobsBySource
      { data: [], error: null }, // fetchHistoryAnglesForProject
    ];
    registry.insertReturnByTable.studio_remarketing_jobs = {
      data: { id: NEW_JOB_ID },
      error: null,
    };

    const { scanForRemarketingOpportunities } = await import(
      '@/features/dmx-studio/lib/remarketing'
    );
    const result = await scanForRemarketingOpportunities(
      { triggerPipeline: false },
      { nowMs: NOW_MS },
    );

    expect(result.scannedCount).toBe(1);
    expect(result.jobsCreated).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify .lt() on rendered_at was sent with stale-before iso (~14d ago).
    const candidatesSelect = registry.selects.find((s) => s.table === 'studio_video_projects');
    expect(candidatesSelect).toBeDefined();
    const ltFilter = candidatesSelect?.filters.find((f) => f.op === 'lt');
    expect(ltFilter).toBeDefined();
    expect(ltFilter?.args[0]).toBe('rendered_at');
    const ltIso = String(ltFilter?.args[1]);
    const expectedIso = new Date(NOW_MS - 14 * 86_400_000).toISOString();
    expect(ltIso).toBe(expectedIso);
  });

  it('dedups projects with remarketing job created_at within 7d cooldown', async () => {
    registry.selectByTable.studio_subscriptions = [
      { data: [{ user_id: ACTIVE_USER_ID, status: 'active' }], error: null },
    ];
    // Two candidates returned (both rendered >14d ago).
    registry.selectByTable.studio_video_projects = [
      {
        data: [
          {
            id: PROJECT_RENDERED_OLD_ID,
            user_id: ACTIVE_USER_ID,
            title: 'A',
            status: 'rendered',
            rendered_at: isoDaysAgo(20),
          },
          {
            id: PROJECT_RECENT_REMARKETED_ID,
            user_id: ACTIVE_USER_ID,
            title: 'B',
            status: 'published',
            rendered_at: isoDaysAgo(30),
          },
        ],
        error: null,
      },
    ];
    // Recent jobs: PROJECT_RECENT_REMARKETED_ID was remarketed 3 days ago -> dedup.
    registry.selectByTable.studio_remarketing_jobs = [
      {
        data: [
          {
            source_project_id: PROJECT_RECENT_REMARKETED_ID,
            angle: 'cocina',
            created_at: isoDaysAgo(3),
          },
        ],
        error: null,
      },
      // history fetch for PROJECT_RENDERED_OLD_ID -> empty.
      { data: [], error: null },
    ];
    registry.insertReturnByTable.studio_remarketing_jobs = {
      data: { id: NEW_JOB_ID },
      error: null,
    };

    const { scanForRemarketingOpportunities } = await import(
      '@/features/dmx-studio/lib/remarketing'
    );
    const result = await scanForRemarketingOpportunities(
      { triggerPipeline: false },
      { nowMs: NOW_MS },
    );

    expect(result.scannedCount).toBe(2);
    // Only one job created (the non-deduped candidate).
    expect(result.jobsCreated).toBe(1);

    const inserts = registry.inserts.filter((i) => i.table === 'studio_remarketing_jobs');
    expect(inserts).toHaveLength(1);
    const payload = inserts[0]?.payload as { source_project_id: string; user_id: string };
    expect(payload.source_project_id).toBe(PROJECT_RENDERED_OLD_ID);
    expect(payload.user_id).toBe(ACTIVE_USER_ID);
  });

  it('inserts job with rotated angle (history "general" -> next "cocina")', async () => {
    registry.selectByTable.studio_subscriptions = [
      { data: [{ user_id: ACTIVE_USER_ID, status: 'trialing' }], error: null },
    ];
    registry.selectByTable.studio_video_projects = [
      {
        data: [
          {
            id: PROJECT_RENDERED_OLD_ID,
            user_id: ACTIVE_USER_ID,
            title: 'Polanco PH',
            status: 'rendered',
            rendered_at: isoDaysAgo(20),
          },
        ],
        error: null,
      },
    ];
    registry.selectByTable.studio_remarketing_jobs = [
      // fetchRecentJobsBySource within cooldown -> empty.
      { data: [], error: null },
      // fetchHistoryAnglesForProject -> last angle was "general".
      {
        data: [{ angle: 'general', created_at: isoDaysAgo(40) }],
        error: null,
      },
    ];
    registry.insertReturnByTable.studio_remarketing_jobs = {
      data: { id: NEW_JOB_ID },
      error: null,
    };

    const { scanForRemarketingOpportunities } = await import(
      '@/features/dmx-studio/lib/remarketing'
    );
    const result = await scanForRemarketingOpportunities(
      { triggerPipeline: false },
      { nowMs: NOW_MS },
    );

    expect(result.jobsCreated).toBe(1);
    const inserts = registry.inserts.filter((i) => i.table === 'studio_remarketing_jobs');
    expect(inserts).toHaveLength(1);
    const payload = inserts[0]?.payload as {
      angle: string;
      status: string;
      source_project_id: string;
    };
    expect(payload.angle).toBe('cocina');
    expect(payload.status).toBe('pending');
    expect(payload.source_project_id).toBe(PROJECT_RENDERED_OLD_ID);
  });
});

describe('scanForRemarketingOpportunities — empty cases', () => {
  it('returns zero counts when there are no active studio users', async () => {
    registry.selectByTable.studio_subscriptions = [{ data: [], error: null }];
    const { scanForRemarketingOpportunities } = await import(
      '@/features/dmx-studio/lib/remarketing'
    );
    const result = await scanForRemarketingOpportunities(
      { triggerPipeline: false },
      { nowMs: NOW_MS },
    );
    expect(result.scannedCount).toBe(0);
    expect(result.jobsCreated).toBe(0);
  });
});

// Suppress unused constant warning — kept for clarity in test data scenarios.
void PROJECT_RENDERED_FRESH_ID;
