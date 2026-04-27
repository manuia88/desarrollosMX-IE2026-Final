// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Usage tracker + predictive warning unit tests.
// Modo A: mock Supabase admin client. Sin créditos API reales.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPredictiveWarning } from '@/features/dmx-studio/lib/usage/predictive-warning';
import {
  checkUsageLimit,
  currentPeriodMonth,
  getCostBreakdown,
  recordVideoGenerated,
} from '@/features/dmx-studio/lib/usage/usage-tracker';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

vi.mock('@/features/dmx-studio/lib/resend/provider', () => ({
  getStudioEmailProvider: vi.fn(() => ({
    name: 'mock' as const,
    send: vi.fn(async () => ({
      providerMessageId: 'mock-1',
      provider: 'mock' as const,
      accepted: true,
      error: null,
    })),
  })),
}));

type AdminClient = ReturnType<typeof createAdminClient>;

interface RecordedInsert {
  table: string;
  payload: unknown;
}

interface RecordedUpdate {
  table: string;
  payload: unknown;
  eqs: ReadonlyArray<{ col: string; val: unknown }>;
}

interface MockState {
  inserts: RecordedInsert[];
  updates: RecordedUpdate[];
  // For .from(table).select(cols).eq(...).maybeSingle() / .single()
  selectMaybeSingle: (
    table: string,
    eqs: ReadonlyArray<{ col: string; val: unknown }>,
  ) => { data: unknown; error: { message: string } | null };
  // For .from(table).select(cols, { count, head }).eq(...) → returns count
  selectCount: (
    table: string,
    eqs: ReadonlyArray<{ col: string; val: unknown }>,
  ) => { count: number; error: { message: string } | null };
  // For .from(table).select(cols).eq(...) (no head) → list of rows
  selectMany: (
    table: string,
    eqs: ReadonlyArray<{ col: string; val: unknown }>,
  ) => { data: unknown[]; error: { message: string } | null };
}

function buildMockClient(state: MockState): AdminClient {
  const client = {
    from(table: string) {
      const insertChain = (payload: unknown) => {
        state.inserts.push({ table, payload });
        return Promise.resolve({ error: null });
      };

      const insertWithSelect = (payload: unknown) => {
        state.inserts.push({ table, payload });
        return {
          select() {
            return {
              async single() {
                return { data: { id: 'mock-id' }, error: null };
              },
            };
          },
        };
      };

      const updateChain = (payload: unknown) => {
        const eqs: { col: string; val: unknown }[] = [];
        const proxy = {
          eq(col: string, val: unknown) {
            eqs.push({ col, val });
            // Chained: keep returning proxy for further .eq calls; only resolve on terminal
            return proxy;
          },
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock matching supabase query builder shape
          then(resolve: (val: { error: null }) => void) {
            state.updates.push({ table, payload, eqs });
            resolve({ error: null });
          },
        };
        return proxy;
      };

      // Track current select chain state
      const eqs: { col: string; val: unknown }[] = [];
      let isCountHead = false;

      type Resolver<T> = (val: T) => void;

      const selectChain = (_cols: string, countOpts?: { count?: 'exact'; head?: boolean }) => {
        isCountHead = countOpts?.head === true;

        const builder: Record<string, unknown> = {};

        const passthrough = (() => builder) as () => typeof builder;

        builder.eq = (col: string, val: unknown) => {
          eqs.push({ col, val });
          return builder;
        };
        builder.gte = passthrough;
        builder.order = passthrough;
        builder.limit = passthrough;
        builder.not = passthrough;
        builder.in = passthrough;
        builder.maybeSingle = async () => state.selectMaybeSingle(table, eqs);
        builder.single = async () => state.selectMaybeSingle(table, eqs);
        // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock matching supabase query builder shape
        builder.then = (
          resolve:
            | Resolver<{ count: number; error: { message: string } | null }>
            | Resolver<{ data: unknown[]; error: { message: string } | null }>,
        ) => {
          if (isCountHead) {
            const r = state.selectCount(table, eqs);
            (resolve as Resolver<{ count: number; error: { message: string } | null }>)({
              count: r.count,
              error: r.error,
            });
          } else {
            (resolve as Resolver<{ data: unknown[]; error: { message: string } | null }>)(
              state.selectMany(table, eqs),
            );
          }
        };

        return builder;
      };

      return {
        insert(payload: unknown) {
          // recordVideoGenerated uses bare insert (no .select() chain) -> Promise<{ error }>
          // logPipelineUsage uses insert(payload).select('id').single() — keep both supported
          const promiseResult = insertChain(payload);
          // Augment with `select()` for chainers
          (promiseResult as unknown as { select: () => unknown }).select = () =>
            insertWithSelect(payload).select();
          return promiseResult;
        },
        update(payload: unknown) {
          return updateChain(payload);
        },
        select(cols: string, opts?: { count?: 'exact'; head?: boolean }) {
          return selectChain(cols, opts);
        },
      };
    },
  } as unknown as AdminClient;
  return client;
}

function createState(overrides: Partial<MockState> = {}): MockState {
  return {
    inserts: [],
    updates: [],
    selectMaybeSingle: () => ({ data: null, error: null }),
    selectCount: () => ({ count: 0, error: null }),
    selectMany: () => ({ data: [], error: null }),
    ...overrides,
  };
}

describe('usage-tracker.recordVideoGenerated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts studio_usage_logs row with metric_type=video_generated and current period_month', async () => {
    const state = createState({
      selectMaybeSingle: (table) => {
        if (table === 'studio_subscriptions') {
          return {
            data: { videos_used_this_period: 0, videos_per_month_limit: 5, plan_key: 'pro' },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      selectCount: () => ({ count: 1, error: null }),
    });
    const client = buildMockClient(state);
    const result = await recordVideoGenerated(
      {
        userId: 'user_1',
        projectId: 'proj_1',
        subscriptionId: 'sub_1',
        costUsd: 0.42,
        aiModel: 'kling',
      },
      { client },
    );

    expect(result.ok).toBe(true);
    const insertedLog = state.inserts.find((i) => i.table === 'studio_usage_logs');
    expect(insertedLog).toBeDefined();
    const payload = insertedLog?.payload as Record<string, unknown>;
    expect(payload.metric_type).toBe('video_generated');
    expect(payload.user_id).toBe('user_1');
    expect(payload.cost_usd).toBe(0.42);
    expect(payload.period_month).toBe(currentPeriodMonth());
    expect((payload.meta as Record<string, unknown>).ai_model).toBe('kling');
  });
});

describe('usage-tracker.checkUsageLimit', () => {
  it('returns ok=true when used < limit', async () => {
    const state = createState({
      selectMaybeSingle: (table) => {
        if (table === 'studio_subscriptions') {
          return {
            data: { plan_key: 'pro', videos_per_month_limit: 5 },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      selectCount: (table) => {
        if (table === 'studio_usage_logs') return { count: 2, error: null };
        return { count: 0, error: null };
      },
    });
    const client = buildMockClient(state);
    const result = await checkUsageLimit('user_1', { client });
    expect(result.ok).toBe(true);
    expect(result.used).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.planKey).toBe('pro');
  });

  it('returns ok=false when used >= limit', async () => {
    const state = createState({
      selectMaybeSingle: (table) => {
        if (table === 'studio_subscriptions') {
          return {
            data: { plan_key: 'pro', videos_per_month_limit: 5 },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      selectCount: () => ({ count: 5, error: null }),
    });
    const client = buildMockClient(state);
    const result = await checkUsageLimit('user_1', { client });
    expect(result.ok).toBe(false);
    expect(result.used).toBe(5);
    expect(result.limit).toBe(5);
  });
});

describe('usage-tracker.getCostBreakdown', () => {
  it('sums cost_usd grouped by ai_model', async () => {
    const state = createState({
      selectMany: (table) => {
        if (table === 'studio_usage_logs') {
          return {
            data: [
              { cost_usd: 0.5, metric_type: 'video_generated', meta: { ai_model: 'kling' } },
              { cost_usd: 0.3, metric_type: 'voice_synthesis', meta: { ai_model: 'elevenlabs' } },
              { cost_usd: 0.2, metric_type: 'copy_generation', meta: { ai_model: 'claude' } },
              { cost_usd: 0.1, metric_type: 'video_generated', meta: { ai_model: 'kling' } },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    });
    const client = buildMockClient(state);
    const result = await getCostBreakdown('user_1', '2026-04', { client });
    expect(result.totalUsd).toBeCloseTo(1.1, 4);
    expect(result.byModel.kling).toBeCloseTo(0.6, 4);
    expect(result.byModel.elevenlabs).toBeCloseTo(0.3, 4);
    expect(result.byModel.claude).toBeCloseTo(0.2, 4);
    // 2 videos at total 1.1 => 0.55 avg
    expect(result.perVideoAvg).toBeCloseTo(0.55, 4);
  });
});

describe('predictive-warning.checkPredictiveWarning', () => {
  it('triggers when usedPct >= 0.8 and no prior warning', async () => {
    const state = createState({
      selectMaybeSingle: (table, eqs) => {
        if (table === 'studio_usage_logs') {
          // existing-flagged check: returns null (no prior warning)
          const hasFlagFilter = eqs.some(
            (e) => e.col === 'threshold_warning_sent' && e.val === true,
          );
          if (hasFlagFilter) return { data: null, error: null };
          return { data: null, error: null };
        }
        if (table === 'studio_subscriptions') {
          return {
            data: { plan_key: 'pro', videos_per_month_limit: 5 },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      selectCount: () => ({ count: 4, error: null }), // 4/5 = 0.8 → triggered
    });
    const client = buildMockClient(state);
    const result = await checkPredictiveWarning(
      { userId: 'user_1' },
      { client, emailTo: 'asesor@example.com' },
    );
    expect(result.triggered).toBe(true);
    expect(result.thresholdPct).toBe(0.8);
    // Update flag should have been issued
    const flagUpdate = state.updates.find(
      (u) =>
        u.table === 'studio_usage_logs' &&
        (u.payload as Record<string, unknown>).threshold_warning_sent === true,
    );
    expect(flagUpdate).toBeDefined();
  });

  it('idempotent: returns triggered=false when threshold_warning_sent=true already exists', async () => {
    const state = createState({
      selectMaybeSingle: (table, eqs) => {
        if (table === 'studio_usage_logs') {
          const hasFlagFilter = eqs.some(
            (e) => e.col === 'threshold_warning_sent' && e.val === true,
          );
          if (hasFlagFilter) {
            return { data: { id: 'log-already-flagged' }, error: null };
          }
        }
        return { data: null, error: null };
      },
    });
    const client = buildMockClient(state);
    const result = await checkPredictiveWarning(
      { userId: 'user_1' },
      { client, emailTo: 'asesor@example.com' },
    );
    expect(result.triggered).toBe(false);
    expect(result.sentAt).toBeNull();
    // No flag update should have been issued (since already flagged)
    const flagUpdate = state.updates.find(
      (u) =>
        u.table === 'studio_usage_logs' &&
        (u.payload as Record<string, unknown>).threshold_warning_sent === true,
    );
    expect(flagUpdate).toBeUndefined();
  });
});
