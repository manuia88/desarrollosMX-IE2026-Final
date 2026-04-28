// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Virtual staging + drone path coverage.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre flujos: studioSprint6VirtualStagingRouter (5 styles canon) + studioSprint6DroneRouter
//   (4 flightPattern canon: orbital/flyover/approach/reveal). Agency-plan-only paywall enforced.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

// Force feature flags ON for tests (default false in production env).
process.env.SEEDANCE_ENABLED = 'true';
process.env.VIRTUAL_STAGING_ENABLED = 'true';
process.env.DRONE_SIM_ENABLED = 'true';
process.env.CINEMA_MODE_ENABLED = 'true';

const stageRoomMock = vi.fn(
  async (args: { imageUrl: string; style: string; roomType: string }) => ({
    stagedImageUrl: `staged/${args.style}_${args.roomType}.png`,
    costUsd: 0.12,
    pedraJobId: `pedra_${Date.now()}`,
  }),
);

vi.mock('@/features/dmx-studio/lib/virtual-staging', () => ({
  stageRoom: stageRoomMock,
}));

const generateVideoWithAudioMock = vi.fn(async () => ({
  videoUrl: 'https://fal.run/seedance/output.mp4',
  costUsd: 0.5,
  requestId: 'req_seedance_test',
}));

vi.mock('@/features/dmx-studio/lib/fal-gateway/seedance', async () => {
  const { z } = await import('zod');
  return {
    generateVideoWithAudio: generateVideoWithAudioMock,
    GenerateSeedanceClipInputSchema: z.object({
      prompt: z.string().min(1),
      audioContext: z.enum(['auto', 'cocina', 'sala']).optional(),
      durationSeconds: z.number().int().min(3).max(15).optional(),
      resolution: z.enum(['720p', '1080p']).optional(),
    }),
  };
});

interface AdminTableState {
  selectMaybeSingle?: { data: Record<string, unknown> | null; error: unknown };
  selectList?: { data: Array<Record<string, unknown>>; error: unknown };
  insertResult?: { data: Record<string, unknown> | null; error: unknown };
  updateResult?: { error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

function makeSelectChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  builder.eq = passthrough;
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
  // biome-ignore lint/suspicious/noThenProperty: thenable result
  builder.then = (resolve: (v: { error: unknown }) => void) => {
    resolve(state?.updateResult ?? { error: null });
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
      resolve(state?.selectList ?? { data: [{ id: 'new_id' }], error: null });
    },
  });
  // biome-ignore lint/suspicious/noThenProperty: thenable result
  builder.then = (resolve: (v: { error: unknown }) => void) => {
    resolve({ error: state?.insertResult?.error ?? null });
  };
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
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_PROJECT_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_ASSET_ID = 'cc333333-3333-4333-8333-333333333333';

function buildCtx(): Context {
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: () => ({
      select: () => ({
        eq: () => ({
          async maybeSingle() {
            return {
              data: {
                studio_role: 'studio_user',
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
    user: { id: DEFAULT_USER_ID, email: 'staging-drone@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

function setupAgencyContext() {
  // studioProcedure middleware: studio_users_extension lookup
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
  // studioAgencyProcedure middleware: studio_subscriptions plan_key=agency
  adminTables.studio_subscriptions = {
    selectMaybeSingle: {
      data: { plan_key: 'agency', status: 'active' },
      error: null,
    },
  };
}

beforeEach(() => {
  adminTables = {};
  stageRoomMock.mockClear();
  generateVideoWithAudioMock.mockClear();
});

afterEach(() => {
  vi.resetModules();
});

const STAGING_STYLES = ['modern', 'classic', 'minimalist', 'industrial', 'bohemian'] as const;
const FLIGHT_PATTERNS = ['orbital', 'flyover', 'approach', 'reveal'] as const;

describe('Staging path — studioSprint6VirtualStagingRouter.stageAsset (5 styles canon)', () => {
  for (const style of STAGING_STYLES) {
    it(`stages asset with style=${style} (Agency plan)`, async () => {
      setupAgencyContext();
      adminTables.studio_virtual_staging_jobs = {
        insertResult: { data: { id: `job_${style}` }, error: null },
        updateResult: { error: null },
      };
      const { studioSprint6VirtualStagingRouter } = await import(
        '@/features/dmx-studio/routes/sprint6'
      );
      const caller = studioSprint6VirtualStagingRouter.createCaller(buildCtx());
      const result = await caller.stageAsset({
        projectId: DEFAULT_PROJECT_ID,
        sourceAssetId: DEFAULT_ASSET_ID,
        imageUrl: 'https://example.com/source.jpg',
        style,
        roomType: 'living',
      });
      expect(result.jobId).toBe(`job_${style}`);
      expect(stageRoomMock).toHaveBeenCalledWith(
        expect.objectContaining({ style, roomType: 'living' }),
      );
    });
  }

  it('rejects FORBIDDEN when user not on Agency plan', async () => {
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
    const { studioSprint6VirtualStagingRouter } = await import(
      '@/features/dmx-studio/routes/sprint6'
    );
    const caller = studioSprint6VirtualStagingRouter.createCaller(buildCtx());
    await expect(
      caller.stageAsset({
        projectId: DEFAULT_PROJECT_ID,
        sourceAssetId: DEFAULT_ASSET_ID,
        imageUrl: 'https://example.com/source.jpg',
        style: 'modern',
        roomType: 'living',
      }),
    ).rejects.toThrow(/Agency/);
  });
});

describe('Drone path — studioSprint6DroneRouter.simulate (4 flightPattern canon)', () => {
  for (const pattern of FLIGHT_PATTERNS) {
    it(`simulates flight pattern=${pattern} (Agency plan)`, async () => {
      setupAgencyContext();
      adminTables.studio_drone_simulations = {
        insertResult: { data: { id: `sim_${pattern}` }, error: null },
      };
      const { studioSprint6DroneRouter } = await import('@/features/dmx-studio/routes/sprint6');
      const caller = studioSprint6DroneRouter.createCaller(buildCtx());
      const result = await caller.simulate({
        projectId: DEFAULT_PROJECT_ID,
        imageUrl: 'https://example.com/aerial.jpg',
        flightPattern: pattern,
        durationSeconds: 7,
      });
      expect(result.simulationId).toBe(`sim_${pattern}`);
      expect(result.status).toBe('pending');
    });
  }
});

describe('Cinema mode — studioSprint6CinemaModeRouter.enable', () => {
  it('enables cinema_mode meta on owned project', async () => {
    setupAgencyContext();
    adminTables.studio_video_projects = {
      selectMaybeSingle: {
        data: { id: DEFAULT_PROJECT_ID, user_id: DEFAULT_USER_ID, meta: {} },
        error: null,
      },
      updateResult: { error: null },
    };
    const { studioSprint6CinemaModeRouter } = await import('@/features/dmx-studio/routes/sprint6');
    const caller = studioSprint6CinemaModeRouter.createCaller(buildCtx());
    const result = await caller.enable({ projectId: DEFAULT_PROJECT_ID });
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.features)).toBe(true);
  });
});

describe('Toggles — studioSprint6TogglesRouter.getAvailability', () => {
  it('returns isAgency=true and all flags ON when subscription active+agency', async () => {
    setupAgencyContext();
    const { studioSprint6TogglesRouter } = await import('@/features/dmx-studio/routes/sprint6');
    const caller = studioSprint6TogglesRouter.createCaller(buildCtx());
    const result = await caller.getAvailability();
    expect(result.planKey).toBe('agency');
    expect(result.isAgency).toBe(true);
    expect(result.flags.virtualStaging).toBe(true);
    expect(result.flags.droneSim).toBe(true);
  });

  it('returns isAgency=false when no subscription', async () => {
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
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioSprint6TogglesRouter } = await import('@/features/dmx-studio/routes/sprint6');
    const caller = studioSprint6TogglesRouter.createCaller(buildCtx());
    const result = await caller.getAvailability();
    expect(result.isAgency).toBe(false);
    expect(result.flags.virtualStaging).toBe(false);
  });
});

describe('Module export smoke', () => {
  it('exports staging + drone + cinema routers', async () => {
    const mod = await import('@/features/dmx-studio/routes/sprint6');
    expect(mod.studioSprint6VirtualStagingRouter).toBeDefined();
    expect(mod.studioSprint6DroneRouter).toBeDefined();
    expect(mod.studioSprint6CinemaModeRouter).toBeDefined();
    expect(mod.studioSprint6TogglesRouter).toBeDefined();
    expect(mod.studioSprint6SeedanceRouter).toBeDefined();
  });
});
