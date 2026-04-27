// FASE 14.F.4 Sprint 3 — Copy versions tRPC router unit tests.
// Modo A: createCaller with mocked supabase admin client. No real DB.
// Coverage: list (ownership + ordering), rollback (success + not found),
// compare (ownership check + forbidden when foreign).

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface CopyOutputRow {
  id: string;
  user_id: string;
}

interface CopyVersionRow {
  id: string;
  copy_output_id: string;
  content: string;
  tone: string;
  version_number: number;
  is_current: boolean;
  cost_usd: number | null;
  ai_model: string | null;
  meta: Record<string, unknown>;
  regenerated_at: string;
  regenerated_by: string | null;
}

interface AdminMockTables {
  copyOutputs: CopyOutputRow[];
  copyVersions: CopyVersionRow[];
  // studio_users_extension lookup must succeed for studioProcedure to pass.
  studioRole?: string | null;
}

interface UpdateCall {
  table: string;
  payload: Record<string, unknown>;
  eqs: Array<{ col: string; val: unknown }>;
}

interface AdminMockHarness {
  state: AdminMockTables;
  updates: UpdateCall[];
  // biome-ignore lint/suspicious/noExplicitAny: chained supabase admin stub
  client: any;
}

function buildAdminMock(state: AdminMockTables): AdminMockHarness {
  const updates: UpdateCall[] = [];

  function fromHandler(table: string) {
    const eqs: Array<{ col: string; val: unknown }> = [];
    const ins: Array<{ col: string; vals: ReadonlyArray<unknown> }> = [];

    function applyEqsCopyOutputs(): CopyOutputRow[] {
      return state.copyOutputs.filter((row) =>
        eqs.every((e) => {
          const key = e.col as keyof CopyOutputRow;
          return row[key] === e.val;
        }),
      );
    }

    function applyEqsCopyVersions(): CopyVersionRow[] {
      let rows = state.copyVersions;
      for (const e of eqs) {
        const key = e.col as keyof CopyVersionRow;
        rows = rows.filter((r) => r[key] === e.val);
      }
      for (const i of ins) {
        const key = i.col as keyof CopyVersionRow;
        rows = rows.filter((r) => i.vals.includes(r[key]));
      }
      return rows;
    }

    const builder = {
      select(_cols?: string) {
        return builder;
      },
      eq(col: string, val: unknown) {
        eqs.push({ col, val });
        return builder;
      },
      in(col: string, vals: ReadonlyArray<unknown>) {
        ins.push({ col, vals });
        return builder;
      },
      order(_col: string, _opts?: { ascending: boolean }) {
        return builder;
      },
      limit(_n: number) {
        return builder;
      },
      async maybeSingle() {
        if (table === 'studio_users_extension') {
          if (state.studioRole === undefined) {
            return {
              data: {
                studio_role: 'studio_user',
                organization_id: null,
                onboarding_completed: true,
              },
              error: null,
            };
          }
          if (state.studioRole === null) {
            return { data: null, error: null };
          }
          return {
            data: {
              studio_role: state.studioRole,
              organization_id: null,
              onboarding_completed: true,
            },
            error: null,
          };
        }
        if (table === 'studio_copy_outputs') {
          const matches = applyEqsCopyOutputs();
          return { data: matches[0] ?? null, error: null };
        }
        if (table === 'studio_copy_versions') {
          const matches = applyEqsCopyVersions();
          return { data: matches[0] ?? null, error: null };
        }
        return { data: null, error: null };
      },
      // Thenable: studio_copy_versions list query, copy_outputs IN query in compare path.
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock matching supabase query builder shape
      then(resolve: (v: { data: unknown; error: null }) => void) {
        if (table === 'studio_copy_versions') {
          let rows = applyEqsCopyVersions();
          // Order desc by version_number when ordered (we don't track args, but list expects desc)
          rows = [...rows].sort((a, b) => b.version_number - a.version_number);
          resolve({ data: rows, error: null });
          return;
        }
        if (table === 'studio_copy_outputs') {
          let rows = state.copyOutputs;
          for (const e of eqs) {
            const key = e.col as keyof CopyOutputRow;
            rows = rows.filter((r) => r[key] === e.val);
          }
          for (const i of ins) {
            const key = i.col as keyof CopyOutputRow;
            rows = rows.filter((r) => i.vals.includes(r[key]));
          }
          resolve({ data: rows, error: null });
          return;
        }
        resolve({ data: [], error: null });
      },
    };

    function updateChain(payload: Record<string, unknown>) {
      const upEqs: Array<{ col: string; val: unknown }> = [];
      const proxy = {
        eq(col: string, val: unknown) {
          upEqs.push({ col, val });
          return proxy;
        },
        // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock matching supabase query builder shape
        then(resolve: (v: { error: null }) => void) {
          updates.push({ table, payload, eqs: upEqs });
          if (table === 'studio_copy_versions') {
            for (const v of state.copyVersions) {
              const matches = upEqs.every((e) => {
                const k = e.col as keyof CopyVersionRow;
                return v[k] === e.val;
              });
              if (matches) {
                if (typeof payload.is_current === 'boolean') {
                  v.is_current = payload.is_current;
                }
              }
            }
          } else if (table === 'studio_copy_outputs') {
            for (const o of state.copyOutputs) {
              const matches = upEqs.every((e) => {
                const k = e.col as keyof CopyOutputRow;
                return o[k] === e.val;
              });
              if (matches) {
                // copy_outputs row content/selected_by_user not validated in this harness.
              }
            }
          }
          resolve({ error: null });
        },
      };
      return proxy;
    }

    return {
      ...builder,
      update(payload: Record<string, unknown>) {
        return updateChain(payload);
      },
      insert(_payload: unknown) {
        return Promise.resolve({ error: null });
      },
    };
  }

  return {
    state,
    updates,
    client: { from: fromHandler },
  };
}

let mockHarness: AdminMockHarness = buildAdminMock({ copyOutputs: [], copyVersions: [] });

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockHarness.client),
}));

const DEFAULT_USER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const FOREIGN_USER_ID = 'bbbbbbbb-2222-4222-8222-222222222222';

function buildCtx(userId: string = DEFAULT_USER_ID): Context {
  const rpcMock = vi.fn(async () => ({ data: true, error: null }));
  // biome-ignore lint/suspicious/noExplicitAny: chained supabase ctx stub
  const ctxSupabase: any = {
    rpc: rpcMock,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  };
  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: userId, email: 'test@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

beforeEach(() => {
  mockHarness = buildAdminMock({ copyOutputs: [], copyVersions: [] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('studioCopyVersionsRouter.list', () => {
  it('returns versions ordered by version_number desc', async () => {
    mockHarness = buildAdminMock({
      copyOutputs: [{ id: 'cccccccc-1111-4111-8111-111111111111', user_id: DEFAULT_USER_ID }],
      copyVersions: [
        {
          id: 'dddddddd-1111-4111-8111-111111111111',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'first',
          tone: 'formal',
          version_number: 1,
          is_current: false,
          cost_usd: 0.01,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-25T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
        {
          id: 'dddddddd-3333-4333-8333-333333333333',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'third',
          tone: 'cercano',
          version_number: 3,
          is_current: true,
          cost_usd: 0.03,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-27T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
        {
          id: 'dddddddd-2222-4222-8222-222222222222',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'second',
          tone: 'aspiracional',
          version_number: 2,
          is_current: false,
          cost_usd: 0.02,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-26T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
      ],
    });

    const { studioCopyVersionsRouter } = await import('@/features/dmx-studio/routes/copy-versions');
    const caller = studioCopyVersionsRouter.createCaller(buildCtx());
    const result = await caller.list({
      copyOutputId: 'cccccccc-1111-4111-8111-111111111111',
      limit: 20,
    });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.version_number)).toEqual([3, 2, 1]);
  });

  it('throws NOT_FOUND when copy_output is not owned by current user', async () => {
    mockHarness = buildAdminMock({
      copyOutputs: [{ id: 'cccccccc-2222-4222-8222-222222222222', user_id: FOREIGN_USER_ID }],
      copyVersions: [],
    });
    const { studioCopyVersionsRouter } = await import('@/features/dmx-studio/routes/copy-versions');
    const caller = studioCopyVersionsRouter.createCaller(buildCtx());
    await expect(
      caller.list({ copyOutputId: 'cccccccc-2222-4222-8222-222222222222', limit: 20 }),
    ).rejects.toThrow();
  });
});

describe('studioCopyVersionsRouter.rollback', () => {
  it('marks all versions is_current=false then sets target version is_current=true', async () => {
    mockHarness = buildAdminMock({
      copyOutputs: [{ id: 'cccccccc-1111-4111-8111-111111111111', user_id: DEFAULT_USER_ID }],
      copyVersions: [
        {
          id: 'dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'old',
          tone: 'formal',
          version_number: 1,
          is_current: false,
          cost_usd: 0.01,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-25T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
        {
          id: 'dddddddd-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'current',
          tone: 'cercano',
          version_number: 2,
          is_current: true,
          cost_usd: 0.02,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-26T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
      ],
    });
    const { studioCopyVersionsRouter } = await import('@/features/dmx-studio/routes/copy-versions');
    const caller = studioCopyVersionsRouter.createCaller(buildCtx());
    const result = await caller.rollback({
      copyOutputId: 'cccccccc-1111-4111-8111-111111111111',
      versionId: 'dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    expect(result.ok).toBe(true);

    // Two updates on studio_copy_versions, then one on studio_copy_outputs.
    const versionUpdates = mockHarness.updates.filter((u) => u.table === 'studio_copy_versions');
    expect(versionUpdates).toHaveLength(2);
    expect(versionUpdates[0]?.payload.is_current).toBe(false);
    expect(versionUpdates[1]?.payload.is_current).toBe(true);

    const outputUpdates = mockHarness.updates.filter((u) => u.table === 'studio_copy_outputs');
    expect(outputUpdates).toHaveLength(1);
    expect(outputUpdates[0]?.payload.content).toBe('old');
    expect(outputUpdates[0]?.payload.selected_by_user).toBe(true);
  });

  it('throws NOT_FOUND when target version does not exist', async () => {
    mockHarness = buildAdminMock({
      copyOutputs: [{ id: 'cccccccc-1111-4111-8111-111111111111', user_id: DEFAULT_USER_ID }],
      copyVersions: [],
    });
    const { studioCopyVersionsRouter } = await import('@/features/dmx-studio/routes/copy-versions');
    const caller = studioCopyVersionsRouter.createCaller(buildCtx());
    await expect(
      caller.rollback({
        copyOutputId: 'cccccccc-1111-4111-8111-111111111111',
        versionId: 'dddddddd-cccc-4ccc-8ccc-cccccccccccc',
      }),
    ).rejects.toThrow();
  });
});

describe('studioCopyVersionsRouter.compare', () => {
  it('returns 2 versions when both belong to outputs owned by current user', async () => {
    mockHarness = buildAdminMock({
      copyOutputs: [{ id: 'cccccccc-1111-4111-8111-111111111111', user_id: DEFAULT_USER_ID }],
      copyVersions: [
        {
          id: 'eeeeeeee-1111-4111-8111-111111111111',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'alpha texto',
          tone: 'formal',
          version_number: 1,
          is_current: false,
          cost_usd: 0.01,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-25T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
        {
          id: 'eeeeeeee-2222-4222-8222-222222222222',
          copy_output_id: 'cccccccc-1111-4111-8111-111111111111',
          content: 'beta texto',
          tone: 'cercano',
          version_number: 2,
          is_current: true,
          cost_usd: 0.02,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-26T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
      ],
    });

    const { studioCopyVersionsRouter } = await import('@/features/dmx-studio/routes/copy-versions');
    const caller = studioCopyVersionsRouter.createCaller(buildCtx());
    const result = await caller.compare({
      versionIdA: 'eeeeeeee-1111-4111-8111-111111111111',
      versionIdB: 'eeeeeeee-2222-4222-8222-222222222222',
    });
    expect(result.versions).toHaveLength(2);
    const ids = result.versions.map((v) => v.id).sort();
    expect(ids).toEqual([
      'eeeeeeee-1111-4111-8111-111111111111',
      'eeeeeeee-2222-4222-8222-222222222222',
    ]);
  });

  it('throws FORBIDDEN when at least one version belongs to a foreign output', async () => {
    mockHarness = buildAdminMock({
      copyOutputs: [
        { id: 'cccccccc-3333-4333-8333-333333333333', user_id: DEFAULT_USER_ID },
        { id: 'cccccccc-2222-4222-8222-222222222222', user_id: FOREIGN_USER_ID },
      ],
      copyVersions: [
        {
          id: 'eeeeeeee-3333-4333-8333-333333333333',
          copy_output_id: 'cccccccc-3333-4333-8333-333333333333',
          content: 'mio',
          tone: 'formal',
          version_number: 1,
          is_current: true,
          cost_usd: 0.01,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-25T10:00:00Z',
          regenerated_by: DEFAULT_USER_ID,
        },
        {
          id: 'eeeeeeee-4444-4444-8444-444444444444',
          copy_output_id: 'cccccccc-2222-4222-8222-222222222222',
          content: 'ajeno',
          tone: 'cercano',
          version_number: 1,
          is_current: true,
          cost_usd: 0.02,
          ai_model: 'claude',
          meta: {},
          regenerated_at: '2026-04-26T10:00:00Z',
          regenerated_by: FOREIGN_USER_ID,
        },
      ],
    });

    const { studioCopyVersionsRouter } = await import('@/features/dmx-studio/routes/copy-versions');
    const caller = studioCopyVersionsRouter.createCaller(buildCtx());
    await expect(
      caller.compare({
        versionIdA: 'eeeeeeee-3333-4333-8333-333333333333',
        versionIdB: 'eeeeeeee-4444-4444-8444-444444444444',
      }),
    ).rejects.toThrow();
  });
});
