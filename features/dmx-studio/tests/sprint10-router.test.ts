// F14.F.11 Sprint 10 — Router tests Modo A createCaller mocks.
// Cubre: sprint10Feedback (NPS submit STUB, history real, aggregate STUB),
//        sprint10QaReport (admin gate + STUB download),
//        sprint10HealthCheck (real with all tables OK).

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface AdminMockRegistry {
  inserts: Array<{ table: string; payload: unknown }>;
  maybeSingleByTable: Record<string, Array<{ data: unknown; error: unknown }>>;
  selectByTable: Record<string, { data: unknown[]; error: unknown }>;
  countByTable: Record<string, { count: number; error: unknown }>;
}

let registry: AdminMockRegistry = {
  inserts: [],
  maybeSingleByTable: {},
  selectByTable: {},
  countByTable: {},
};

function resetRegistry() {
  registry = {
    inserts: [],
    maybeSingleByTable: {},
    selectByTable: {},
    countByTable: {},
  };
}

function popMaybeSingle(table: string): { data: unknown; error: unknown } {
  const queue = registry.maybeSingleByTable[table];
  if (!queue || queue.length === 0) return { data: null, error: null };
  return queue.shift() ?? { data: null, error: null };
}

function buildAdminClient() {
  return {
    from(table: string) {
      const selectChain = (cols?: string, opts?: { count?: string; head?: boolean }) => {
        const builder: Record<string, unknown> = {};
        const pass = (() => builder) as () => typeof builder;
        builder.eq = pass;
        builder.gte = pass;
        builder.lte = pass;
        builder.in = pass;
        builder.order = pass;
        builder.limit = pass;
        builder.not = pass;
        builder.maybeSingle = async () => popMaybeSingle(table);
        builder.single = async () => popMaybeSingle(table);
        // count head request shape
        if (opts?.head === true && opts.count === 'exact') {
          // biome-ignore lint/suspicious/noThenProperty: thenable mock
          builder.then = (resolve: (v: { count: number; error: unknown }) => void) => {
            const r = registry.countByTable[table] ?? { count: 0, error: null };
            resolve(r);
          };
          return builder;
        }
        // biome-ignore lint/suspicious/noThenProperty: thenable mock
        builder.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
          const r = registry.selectByTable[table] ?? { data: [], error: null };
          resolve(r);
        };
        return builder;
      };

      const insertChain = (payload: unknown) => {
        registry.inserts.push({ table, payload });
        const builder: Record<string, unknown> = {};
        // biome-ignore lint/suspicious/noThenProperty: thenable mock
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          resolve({ error: null });
        };
        return builder;
      };

      return {
        select: selectChain,
        insert: insertChain,
      };
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';

function buildCtx(): Context {
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: vi.fn(),
  };
  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: DEFAULT_USER_ID, email: 'asesor@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

function enqueueStudioExtensionRow(role: 'studio_user' | 'studio_admin' = 'studio_user') {
  registry.maybeSingleByTable.studio_users_extension =
    registry.maybeSingleByTable.studio_users_extension ?? [];
  registry.maybeSingleByTable.studio_users_extension.push({
    data: {
      studio_role: role,
      organization_id: null,
      onboarding_completed: true,
    },
    error: null,
  });
}

beforeEach(() => {
  resetRegistry();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('sprint10FeedbackRouter — module exports', () => {
  it('exports submitNps + getFeedbackHistory + getNpsAggregate', async () => {
    const mod = await import('@/features/dmx-studio/routes/sprint10');
    const r = mod.sprint10FeedbackRouter as unknown as {
      _def: { record: Record<string, unknown> };
    };
    const names = Object.keys(r._def.record).sort();
    expect(names).toEqual(['getFeedbackHistory', 'getNpsAggregate', 'submitNps']);
  });
});

describe('sprint10FeedbackRouter.submitNps — STUB ADR-018 H2', () => {
  it('throws NOT_IMPLEMENTED with STUB message + L-NEW pointer', async () => {
    enqueueStudioExtensionRow();
    const { sprint10FeedbackRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10FeedbackRouter.createCaller(buildCtx());
    await expect(caller.submitNps({ score: 9, context: 'post_video' })).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
      message: expect.stringContaining('STUB ADR-018'),
    });
    await expect(caller.submitNps({ score: 9, context: 'post_video' })).rejects.toMatchObject({
      message: expect.stringContaining('L-NEW-STUDIO-NPS-DATA-COLLECTION-ACTIVATE'),
    });
  });
});

describe('sprint10FeedbackRouter.getFeedbackHistory', () => {
  it('returns empty list with stubH2 flag for new asesor', async () => {
    enqueueStudioExtensionRow();
    registry.selectByTable.studio_feedback = { data: [], error: null };
    const { sprint10FeedbackRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10FeedbackRouter.createCaller(buildCtx());
    const result = await caller.getFeedbackHistory();
    expect(result.items).toEqual([]);
    expect(result.stubH2).toBe(true);
    expect(result.stubMessage).toContain('STUB ADR-018');
  });
});

describe('sprint10FeedbackRouter.getNpsAggregate — STUB ADR-018 H2', () => {
  it('throws NOT_IMPLEMENTED until founder activa', async () => {
    enqueueStudioExtensionRow();
    const { sprint10FeedbackRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10FeedbackRouter.createCaller(buildCtx());
    await expect(caller.getNpsAggregate({ rangeDays: 30 })).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
  });
});

describe('sprint10QaReportRouter.getReport — admin gate', () => {
  it('returns FORBIDDEN for studio_user role', async () => {
    enqueueStudioExtensionRow('studio_user');
    const { sprint10QaReportRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10QaReportRouter.createCaller(buildCtx());
    await expect(caller.getReport()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns summary + STUB H2 flag for studio_admin role', async () => {
    enqueueStudioExtensionRow('studio_admin');
    const { sprint10QaReportRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10QaReportRouter.createCaller(buildCtx());
    const result = await caller.getReport();
    expect(result.stubH2).toBe(true);
    expect(result.summary.totalStudioTables).toBe(44);
    expect(result.summary.rlsCoveragePct).toBe(100);
    expect(result.summary.baselineTests).toBeGreaterThan(4000);
    expect(result.reportPath).toContain('QA_REPORT_SPRINT10.md');
  });
});

describe('sprint10QaReportRouter.downloadFullReport — admin STUB H2', () => {
  it('throws NOT_IMPLEMENTED for admin until activated', async () => {
    enqueueStudioExtensionRow('studio_admin');
    const { sprint10QaReportRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10QaReportRouter.createCaller(buildCtx());
    await expect(caller.downloadFullReport()).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
  });
});

describe('sprint10HealthCheckRouter.getStudioHealth — real H1', () => {
  it('returns healthy when all tables respond OK', async () => {
    enqueueStudioExtensionRow();
    // All 7 critical tables respond OK
    [
      'studio_organizations',
      'studio_users_extension',
      'studio_video_projects',
      'studio_video_outputs',
      'studio_feedback',
      'studio_api_jobs',
      'studio_usage_logs',
    ].forEach((t) => {
      registry.countByTable[t] = { count: 0, error: null };
    });
    const { sprint10HealthCheckRouter } = await import('@/features/dmx-studio/routes/sprint10');
    const caller = sprint10HealthCheckRouter.createCaller(buildCtx());
    const result = await caller.getStudioHealth();
    expect(result.status).toBe('healthy');
    expect(result.sprint).toBe('Sprint 10');
    expect(result.version).toBe('v1.0.0-beta');
    expect(result.tables.length).toBe(7);
    for (const check of result.tables) {
      expect(check.ok).toBe(true);
    }
  });
});
