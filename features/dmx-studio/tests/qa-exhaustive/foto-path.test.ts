// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Foto path coverage.
// Modo A: createCaller mocks (zero DB real, zero credits API). Cubre matriz:
//   - studioMultiFormatRouter.generateAdditionalFormats — Pro plan + Foto plan + Agency plan.
//   - hookVariants × hook_a/hook_b/hook_c × formatos 16:9 + 9:16 + 1:1.
//   - applyBrandingToggle: branded ON/OFF.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const generateAllFormatsMock = vi.fn(
  async (args: {
    projectId: string;
    userId: string;
    hookVariant: string;
    sourceStoragePath: string;
    enableBeatSync?: boolean;
  }) => ({
    projectId: args.projectId,
    hookVariant: args.hookVariant,
    formats: [
      { format: '16x9', storagePath: `${args.projectId}/${args.hookVariant}_16x9.mp4` },
      { format: '9x16', storagePath: `${args.projectId}/${args.hookVariant}_9x16.mp4` },
      { format: '1x1', storagePath: `${args.projectId}/${args.hookVariant}_1x1.mp4` },
    ],
    beatSyncEnabled: args.enableBeatSync ?? false,
  }),
);

vi.mock('@/features/dmx-studio/lib/assembler/multi-format', () => ({
  generateAllFormats: generateAllFormatsMock,
}));

interface AdminTableState {
  selectMaybeSingle?: { data: Record<string, unknown> | null; error: unknown };
  updateResult?: { error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const state = adminTables[table];
      return {
        select() {
          const chain: Record<string, unknown> = {};
          chain.eq = () => chain;
          chain.maybeSingle = async () => state?.selectMaybeSingle ?? { data: null, error: null };
          chain.single = async () => state?.selectMaybeSingle ?? { data: null, error: null };
          return chain;
        },
        update() {
          return {
            eq() {
              return Promise.resolve(state?.updateResult ?? { error: null });
            },
          };
        },
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_PROJECT_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_VIDEO_OUTPUT_ID = 'cc333333-3333-4333-8333-333333333333';

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
    user: { id: DEFAULT_USER_ID, email: 'foto-path@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

beforeEach(() => {
  adminTables = {};
  generateAllFormatsMock.mockClear();
  // Default extension row (avoid auto-insert path).
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
});

afterEach(() => {
  vi.resetModules();
});

describe('Foto path — studioMultiFormatRouter.generateAdditionalFormats', () => {
  it('generates 3 formats (16:9 + 9:16 + 1:1) for hook_a (Pro plan equivalent)', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_VIDEO_OUTPUT_ID,
          project_id: DEFAULT_PROJECT_ID,
          hook_variant: 'hook_a',
          format: '9x16',
          storage_url: 'storage/source_9x16.mp4',
          duration_seconds: 28,
          size_bytes: 5_000_000,
        },
        error: null,
      },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    const result = (await caller.generateAdditionalFormats({
      projectId: DEFAULT_PROJECT_ID,
      hookVariant: 'hook_a',
      enableBeatSync: false,
    })) as unknown as {
      formats: ReadonlyArray<{ format: string }>;
      beatSyncEnabled: boolean;
      hookVariant: string;
    };
    expect(result.formats.length).toBe(3);
    expect(result.formats.map((f) => f.format).sort()).toEqual(['16x9', '1x1', '9x16']);
    expect(generateAllFormatsMock).toHaveBeenCalledTimes(1);
    expect(generateAllFormatsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hookVariant: 'hook_a',
        userId: DEFAULT_USER_ID,
        enableBeatSync: false,
      }),
    );
  });

  it('hook_b + beat sync ON (Foto plan equivalent — same procedure since paywall is upstream)', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_VIDEO_OUTPUT_ID,
          project_id: DEFAULT_PROJECT_ID,
          hook_variant: 'hook_b',
          format: '9x16',
          storage_url: 'storage/source_9x16.mp4',
          duration_seconds: 28,
          size_bytes: 5_000_000,
        },
        error: null,
      },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    const result = (await caller.generateAdditionalFormats({
      projectId: DEFAULT_PROJECT_ID,
      hookVariant: 'hook_b',
      enableBeatSync: true,
    })) as unknown as { beatSyncEnabled: boolean };
    expect(result.beatSyncEnabled).toBe(true);
    expect(generateAllFormatsMock).toHaveBeenCalledWith(
      expect.objectContaining({ hookVariant: 'hook_b', enableBeatSync: true }),
    );
  });

  it('hook_c covers all variants (Agency plan equivalent)', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_VIDEO_OUTPUT_ID,
          project_id: DEFAULT_PROJECT_ID,
          hook_variant: 'hook_c',
          format: '9x16',
          storage_url: 'storage/source_9x16.mp4',
          duration_seconds: 28,
          size_bytes: 5_000_000,
        },
        error: null,
      },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    const result = (await caller.generateAdditionalFormats({
      projectId: DEFAULT_PROJECT_ID,
      hookVariant: 'hook_c',
      enableBeatSync: false,
    })) as unknown as { hookVariant: string };
    expect(result.hookVariant).toBe('hook_c');
  });

  it('rejects invalid hookVariant via Zod', async () => {
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    await expect(
      caller.generateAdditionalFormats({
        projectId: DEFAULT_PROJECT_ID,
        // @ts-expect-error invalid hook variant for negative path
        hookVariant: 'hook_z',
        enableBeatSync: false,
      }),
    ).rejects.toThrow();
  });

  it('returns NOT_FOUND when source 9x16 video missing', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    await expect(
      caller.generateAdditionalFormats({
        projectId: DEFAULT_PROJECT_ID,
        hookVariant: 'hook_a',
        enableBeatSync: false,
      }),
    ).rejects.toThrow(/source_9x16_not_found/);
  });
});

describe('Foto path — studioMultiFormatRouter.applyBrandingToggle', () => {
  it('branding ON (Foto plan = sin branding optional, validates toggle works)', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: { data: { id: DEFAULT_VIDEO_OUTPUT_ID }, error: null },
      updateResult: { error: null },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    const result = await caller.applyBrandingToggle({
      projectId: DEFAULT_PROJECT_ID,
      videoOutputId: DEFAULT_VIDEO_OUTPUT_ID,
      branded: true,
    });
    expect(result.ok).toBe(true);
    expect(result.branded).toBe(true);
  });

  it('branding OFF — toggle false propagates correctly', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: { data: { id: DEFAULT_VIDEO_OUTPUT_ID }, error: null },
      updateResult: { error: null },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    const result = await caller.applyBrandingToggle({
      projectId: DEFAULT_PROJECT_ID,
      videoOutputId: DEFAULT_VIDEO_OUTPUT_ID,
      branded: false,
    });
    expect(result.branded).toBe(false);
  });

  it('NOT_FOUND when output does not exist or not owned', async () => {
    adminTables.studio_video_outputs = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioMultiFormatRouter } = await import('@/features/dmx-studio/routes/multi-format');
    const caller = studioMultiFormatRouter.createCaller(buildCtx());
    await expect(
      caller.applyBrandingToggle({
        projectId: DEFAULT_PROJECT_ID,
        videoOutputId: DEFAULT_VIDEO_OUTPUT_ID,
        branded: true,
      }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('Foto path — module export smoke', () => {
  it('exports studioMultiFormatRouter with both procedures', async () => {
    const mod = await import('@/features/dmx-studio/routes/multi-format');
    const r = mod.studioMultiFormatRouter as unknown as {
      _def: { record: Record<string, unknown> };
    };
    const names = Object.keys(r._def.record).sort();
    expect(names).toEqual(['applyBrandingToggle', 'generateAdditionalFormats'].sort());
  });
});
