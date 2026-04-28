// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Plan fotografo B2B2C path coverage.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre: onboarding upsertProfile + bulk createBulkBatch + invitations sendInvite +
//   portfolio público portfolioVideos + commission getEarnings + Foto plan paywall +
//   white-label toggle + sin branding logic (markup_pct).

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

interface AdminTableState {
  selectMaybeSingle?: { data: Record<string, unknown> | null; error: unknown };
  selectList?: { data: Array<Record<string, unknown>>; error: unknown };
  insertResult?: { data: Record<string, unknown> | null; error: unknown };
  insertManyResult?: { data: Array<Record<string, unknown>>; error: unknown };
  updateResult?: { data?: Record<string, unknown> | null; error: unknown };
  upsertResult?: { data: Record<string, unknown> | null; error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

function makeSelectChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  builder.eq = passthrough;
  builder.neq = passthrough;
  builder.gte = passthrough;
  builder.lte = passthrough;
  builder.in = passthrough;
  builder.order = passthrough;
  builder.limit = passthrough;
  builder.maybeSingle = async () => state?.selectMaybeSingle ?? { data: null, error: null };
  builder.single = async () => state?.selectMaybeSingle ?? { data: null, error: null };
  // biome-ignore lint/suspicious/noThenProperty: thenable list
  builder.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
    resolve(state?.selectList ?? { data: [], error: null });
  };
  return builder;
}

function makeUpdateChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  builder.eq = () => builder;
  builder.select = () => ({
    async single() {
      return {
        data: state?.updateResult?.data ?? { id: 'updated_id' },
        error: state?.updateResult?.error ?? null,
      };
    },
  });
  // biome-ignore lint/suspicious/noThenProperty: thenable result
  builder.then = (resolve: (v: { error: unknown }) => void) => {
    resolve({ error: state?.updateResult?.error ?? null });
  };
  return builder;
}

function makeInsertChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  builder.select = () => ({
    async single() {
      return state?.insertResult ?? { data: { id: 'new_id' }, error: null };
    },
    // biome-ignore lint/suspicious/noThenProperty: thenable list
    then(resolve: (v: { data: unknown[]; error: unknown }) => void) {
      resolve(
        state?.insertManyResult ?? {
          data: [{ id: 'new_id', input_payload: {}, status: 'queued' }],
          error: null,
        },
      );
    },
  });
  // biome-ignore lint/suspicious/noThenProperty: thenable result
  builder.then = (resolve: (v: { error: unknown }) => void) => {
    resolve({ error: state?.insertResult?.error ?? null });
  };
  return builder;
}

function makeUpsertChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  builder.select = () => ({
    async single() {
      return state?.upsertResult ?? { data: { id: 'upserted_id' }, error: null };
    },
  });
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const state = adminTables[table];
      return {
        select() {
          return makeSelectChain(state);
        },
        update() {
          return makeUpdateChain(state);
        },
        insert() {
          return makeInsertChain(state);
        },
        upsert() {
          return makeUpsertChain(state);
        },
        delete() {
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_PHOTOGRAPHER_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_PROJECT_ID_1 = 'cc333333-3333-4333-8333-333333333333';
const DEFAULT_PROJECT_ID_2 = 'dd444444-4444-4444-8444-444444444444';

function buildCtx(): Context {
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: () => ({
      select: () => ({
        eq: () => ({
          async maybeSingle() {
            return {
              data: {
                studio_role: 'studio_photographer',
                organization_id: null,
                onboarding_completed: true,
              },
              error: null,
            };
          },
        }),
      }),
      insert() {
        return Promise.resolve({ error: null });
      },
    }),
  };
  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: DEFAULT_USER_ID, email: 'photographer@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

function setupFotoContext() {
  adminTables.studio_users_extension = {
    selectMaybeSingle: {
      data: {
        studio_role: 'studio_photographer',
        organization_id: null,
        onboarding_completed: true,
      },
      error: null,
    },
  };
  adminTables.studio_subscriptions = {
    selectMaybeSingle: {
      data: { plan_key: 'foto', status: 'active' },
      error: null,
    },
  };
}

beforeEach(() => {
  adminTables = {};
});

afterEach(() => {
  vi.resetModules();
});

describe('Photographer path — onboarding upsertProfile (Foto plan paywall)', () => {
  it('upserts profile when user on Foto plan', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: null, error: null },
      upsertResult: {
        data: {
          id: DEFAULT_PHOTOGRAPHER_ID,
          business_name: 'Foto Studio MX',
          slug: 'foto-studio-mx-abc',
        },
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = (await caller.upsertProfile({
      businessName: 'Foto Studio MX',
      email: 'foto@example.com',
      specialityZones: ['Roma Norte', 'Condesa'],
    })) as { id: string; business_name: string };
    expect(result.business_name).toBe('Foto Studio MX');
  });

  it('rejects FORBIDDEN when user on Pro plan (not Foto)', async () => {
    adminTables.studio_users_extension = {
      selectMaybeSingle: {
        data: {
          studio_role: 'studio_user',
          organization_id: null,
          onboarding_completed: true,
        },
        error: null,
      },
    };
    adminTables.studio_subscriptions = {
      selectMaybeSingle: {
        data: { plan_key: 'pro', status: 'active' },
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    await expect(
      caller.upsertProfile({
        businessName: 'Foto Studio MX',
        email: 'foto@example.com',
      }),
    ).rejects.toThrow(/Foto/);
  });
});

describe('Photographer path — invitations sendInvite (referral program)', () => {
  it('sends invite for client_invite type', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: { id: DEFAULT_PHOTOGRAPHER_ID }, error: null },
    };
    adminTables.studio_photographer_invites = {
      insertResult: {
        data: {
          id: 'inv_1',
          referral_token: 'tok_xyz',
          invited_email: 'cliente@example.com',
        },
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = (await caller.sendInvite({
      email: 'cliente@example.com',
      name: 'Juan Cliente',
      invitationType: 'client_invite',
    })) as { id: string };
    expect(result.id).toBe('inv_1');
  });

  it('NOT_FOUND when photographer profile missing', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    await expect(
      caller.sendInvite({ email: 'cliente@example.com', invitationType: 'client_invite' }),
    ).rejects.toThrow(/Photographer profile not found/);
  });
});

describe('Photographer path — bulk createBulkBatch', () => {
  it('creates bulk job batch for 2+ projects (max 20)', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: { id: DEFAULT_PHOTOGRAPHER_ID }, error: null },
    };
    adminTables.studio_api_jobs = {
      insertManyResult: {
        data: [
          { id: 'job_1', input_payload: { batchId: 'b1' }, status: 'queued' },
          { id: 'job_2', input_payload: { batchId: 'b1' }, status: 'queued' },
        ],
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = (await caller.createBulkBatch({
      projectIds: [DEFAULT_PROJECT_ID_1, DEFAULT_PROJECT_ID_2],
    })) as { batchId: string; jobs: ReadonlyArray<unknown> };
    expect(result.batchId).toBeDefined();
    expect(result.jobs.length).toBe(2);
  });

  it('rejects via Zod when projectIds < 2', async () => {
    setupFotoContext();
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    await expect(caller.createBulkBatch({ projectIds: [DEFAULT_PROJECT_ID_1] })).rejects.toThrow();
  });
});

describe('Photographer path — toggleWhiteLabel + sin branding (Foto canon)', () => {
  it('enables white_label with custom footer', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      updateResult: {
        data: {
          id: DEFAULT_PHOTOGRAPHER_ID,
          white_label_enabled: true,
          white_label_custom_footer: 'Powered by Foto Studio MX',
        },
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = (await caller.toggleWhiteLabel({
      enabled: true,
      customFooter: 'Powered by Foto Studio MX',
    })) as { white_label_enabled: boolean };
    expect(result.white_label_enabled).toBe(true);
  });

  it('disables white_label (Foto plan = sin branding optional)', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      updateResult: {
        data: { id: DEFAULT_PHOTOGRAPHER_ID, white_label_enabled: false },
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = (await caller.toggleWhiteLabel({ enabled: false })) as {
      white_label_enabled: boolean;
    };
    expect(result.white_label_enabled).toBe(false);
  });
});

describe('Photographer path — pricing calculator (markup_pct)', () => {
  it('calculates studioCost + markup correctly for 50 videos baseline', async () => {
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: { markup_pct: 50 }, error: null },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = await caller.previewPricing({
      photographerId: DEFAULT_PHOTOGRAPHER_ID,
      videosPerMonth: 50,
    });
    expect(result.studioCostUsd).toBe(67); // base Foto plan
    expect(result.markupPct).toBe(50);
    expect(result.totalClientUsd).toBeCloseTo(100.5, 1);
  });

  it('adds extra-video charges for > 50 videos', async () => {
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: { markup_pct: 0 }, error: null },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = await caller.previewPricing({
      photographerId: DEFAULT_PHOTOGRAPHER_ID,
      videosPerMonth: 100, // 50 extras at 1.5 each = 75
    });
    expect(result.studioCostUsd).toBe(67 + 75);
    expect(result.breakdown.extraVideosUsd).toBe(75);
  });
});

describe('Photographer path — portfolio público + commission', () => {
  it('getPortfolioBySlug returns visible portfolio data (publicProcedure)', async () => {
    adminTables.studio_photographers = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_PHOTOGRAPHER_ID,
          business_name: 'Foto Studio MX',
          slug: 'foto-studio-mx',
          rating_avg: 4.7,
          clients_count: 12,
          videos_generated_total: 80,
        },
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = await caller.getPortfolioBySlug({ slug: 'foto-studio-mx' });
    expect(result.business_name).toBe('Foto Studio MX');
    expect(result.rating_avg).toBe(4.7);
  });

  it('getPortfolioBySlug NOT_FOUND when slug missing or portfolio_visible=false', async () => {
    adminTables.studio_photographers = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    await expect(caller.getPortfolioBySlug({ slug: 'unknown' })).rejects.toThrow(
      /Portfolio not found/,
    );
  });

  it('getEarnings returns total commissions from referral_program invites', async () => {
    setupFotoContext();
    adminTables.studio_photographers = {
      selectMaybeSingle: {
        data: { id: DEFAULT_PHOTOGRAPHER_ID, revenue_est_total: 500 },
        error: null,
      },
    };
    adminTables.studio_photographer_invites = {
      selectList: {
        data: [
          { commission_earned_usd: 25, accepted_at: '2026-04-01' },
          { commission_earned_usd: 25, accepted_at: '2026-04-15' },
        ],
        error: null,
      },
    };
    const { studioSprint9PhotographerRouter } = await import(
      '@/features/dmx-studio/routes/sprint9-photographer'
    );
    const caller = studioSprint9PhotographerRouter.createCaller(buildCtx());
    const result = await caller.getEarnings();
    expect(result.totalRevenueUsd).toBe(500);
    expect(result.commissionsUsd).toBe(50);
  });
});

describe('Photographer path — module export smoke', () => {
  it('exports studioSprint9PhotographerRouter with all main procedures', async () => {
    const mod = await import('@/features/dmx-studio/routes/sprint9-photographer');
    const r = mod.studioSprint9PhotographerRouter as unknown as {
      _def: { record: Record<string, unknown> };
    };
    const names = Object.keys(r._def.record);
    expect(names).toContain('upsertProfile');
    expect(names).toContain('sendInvite');
    expect(names).toContain('createBulkBatch');
    expect(names).toContain('toggleWhiteLabel');
    expect(names).toContain('getPortfolioBySlug');
    expect(names).toContain('previewPricing');
    expect(names).toContain('getEarnings');
  });
});
