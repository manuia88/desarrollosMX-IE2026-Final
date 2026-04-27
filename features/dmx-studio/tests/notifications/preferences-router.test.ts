// F14.F.5 Sprint 4 — notifications router: getPreferences default true.
// Modo A: createCaller + mocked supabase admin (no row → defaults).

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface Registry {
  // queue of maybeSingle responses keyed by table
  maybeSingleByTable: Record<string, Array<{ data: unknown; error: unknown }>>;
}

let registry: Registry = { maybeSingleByTable: {} };

function popMaybeSingle(table: string): { data: unknown; error: unknown } {
  const q = registry.maybeSingleByTable[table];
  if (!q || q.length === 0) return { data: null, error: null };
  return q.shift() ?? { data: null, error: null };
}

function buildAdminClient() {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      builder.select = (_cols?: string) => builder;
      builder.eq = (_col: string, _val: unknown) => builder;
      builder.maybeSingle = async () => popMaybeSingle(table);
      builder.insert = async (_p: unknown) => ({ error: null });
      builder.update = (_p: unknown) => {
        const inner: Record<string, unknown> = {};
        inner.eq = async (_c: string, _v: unknown) => ({ error: null });
        return inner;
      };
      return builder;
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
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

function enqueueStudioExtensionRow() {
  registry.maybeSingleByTable.studio_users_extension =
    registry.maybeSingleByTable.studio_users_extension ?? [];
  registry.maybeSingleByTable.studio_users_extension.push({
    data: {
      studio_role: 'studio_user',
      organization_id: null,
      onboarding_completed: true,
    },
    error: null,
  });
}

beforeEach(() => {
  registry = { maybeSingleByTable: {} };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('studioNotificationsRouter.getPreferences — defaults all true when no meta stored', () => {
  it('returns all 5 prefs as true when meta is empty', async () => {
    const mod = await import('@/features/dmx-studio/routes/notifications');
    const router = mod.studioNotificationsRouter;
    // studioProcedure first queries studio_users_extension for role → enqueue once
    enqueueStudioExtensionRow();
    // Then getPreferences itself selects studio_users_extension → enqueue meta-empty
    registry.maybeSingleByTable.studio_users_extension =
      registry.maybeSingleByTable.studio_users_extension ?? [];
    registry.maybeSingleByTable.studio_users_extension.push({
      data: { meta: {} },
      error: null,
    });
    const caller = router.createCaller(buildCtx());
    const prefs = await caller.getPreferences();
    expect(prefs).toEqual({
      emailDailyContentReady: true,
      emailNewRemarketing: true,
      emailStreakMilestone: true,
      emailChallengeWeek: true,
      emailDripCampaign: true,
    });
  });
});
