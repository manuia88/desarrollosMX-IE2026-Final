// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Modo serie/documental path coverage.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre flujos: studioSprint8SeriesRouter list/create/listTemplates + 4 templates canon
//   (residencial/comercial/mixto/custom) + auto-progress + multi-shot consistency.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const createSeriesMock = vi.fn(async (userId: string, input: { title: string }) => ({
  seriesId: 'aa000001-0001-4001-8001-000000000001',
  title: input.title,
  userId,
}));

const listTemplatesMock = vi.fn(
  async (category?: 'residencial' | 'comercial' | 'mixto' | 'custom' | undefined) => {
    const all = [
      { slug: 'residencial-30-eps', category: 'residencial', episodesCount: 30 },
      { slug: 'comercial-10-eps', category: 'comercial', episodesCount: 10 },
      { slug: 'mixto-15-eps', category: 'mixto', episodesCount: 15 },
      { slug: 'custom-flex', category: 'custom', episodesCount: 8 },
    ];
    if (!category) return all;
    return all.filter((t) => t.category === category);
  },
);

const getTemplateBySlugMock = vi.fn(async (slug: string) => {
  if (slug === 'unknown-slug') return null;
  return { slug, category: 'residencial' as const, episodesCount: 12 };
});

const enableAutoProgressMock = vi.fn(
  async (_userId: string, seriesId: string, enabled: boolean) => ({
    seriesId,
    enabled,
  }),
);

const checkProgressTriggersMock = vi.fn(async () => ({
  triggers: [{ seriesId: 'series-1', episodeNumber: 3, reason: 'real_progress_threshold' }],
}));

const generateConsistentEpisodeMock = vi.fn(
  async (_userId: string, seriesId: string, episodeId: string) => ({
    seriesId,
    episodeId,
    consistencyScore: 0.92,
    multiShotsGenerated: 5,
  }),
);

const generateNarrativeArcMock = vi.fn(
  async (_userId: string, _seriesId: string, episodesCount: number) => ({
    episodesCount,
    arc: Array.from({ length: episodesCount }, (_, i) => ({
      episodeNumber: i + 1,
      phase: 'planificacion',
    })),
    costUsd: 0.05,
  }),
);

vi.mock('@/features/dmx-studio/lib/series/manager', () => ({
  createSeries: createSeriesMock,
}));

vi.mock('@/features/dmx-studio/lib/series-templates/seeds', () => ({
  listTemplates: listTemplatesMock,
  getTemplateBySlug: getTemplateBySlugMock,
}));

vi.mock('@/features/dmx-studio/lib/series/auto-progress-trigger', () => ({
  enableAutoProgress: enableAutoProgressMock,
  checkProgressTriggers: checkProgressTriggersMock,
  manualTriggerEpisode: vi.fn(async () => ({ ok: true, triggered: 1 })),
}));

vi.mock('@/features/dmx-studio/lib/series/narrative-generator', () => ({
  generateNarrativeArc: generateNarrativeArcMock,
}));

vi.mock('@/features/dmx-studio/lib/series/narrative-analyst', () => ({
  analyzeProgressForRecommendation: vi.fn(async () => ({
    recommendation: 'next_episode_construccion',
    confidence: 0.8,
  })),
}));

vi.mock('@/features/dmx-studio/lib/series-consistency/multi-shot-engine', () => ({
  generateConsistentEpisode: generateConsistentEpisodeMock,
}));

vi.mock('@/features/dmx-studio/lib/series-consistency/visual-refs-builder', () => ({
  buildVisualRefs: vi.fn(async () => ({ refs: [] })),
}));

vi.mock('@/features/dmx-studio/lib/series-consistency/multi-camera', () => ({
  generateMultiAngleClip: vi.fn(async () => ({ clipsGenerated: 3 })),
}));

vi.mock('@/features/dmx-studio/lib/series-consistency/music-continuity-engine', () => ({
  generateThemeTrack: vi.fn(async () => ({ trackId: 'theme-1' })),
  generateEpisodeVariation: vi.fn(async () => ({ variationId: 'var-1' })),
}));

vi.mock('@/features/dmx-studio/lib/series-crowdsourcing/guest-invite', () => ({
  inviteGuestToEpisode: vi.fn(async () => ({ inviteId: 'inv-1' })),
}));

vi.mock('@/features/dmx-studio/lib/series-ui/title-card-generator', () => ({
  generateTitleCard: vi.fn(async () => ({ titleCardUrl: 'titlecard/1.png' })),
}));

vi.mock('@/shared/lib/marketing-dev-cross-feature', () => ({
  exportSeriesToMarketingCampaign: vi.fn(async () => ({
    ok: false,
    message: 'M14 Marketing Dev not yet shipped',
  })),
}));

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
  builder.select = () => ({
    async maybeSingle() {
      return state?.selectMaybeSingle ?? { data: { id: 'updated_id' }, error: null };
    },
  });
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
    async maybeSingle() {
      return state?.insertResult ?? { data: { id: 'new_id' }, error: null };
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
        delete() {
          return {
            eq() {
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_SERIES_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_EPISODE_ID = 'cc333333-3333-4333-8333-333333333333';

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
    user: { id: DEFAULT_USER_ID, email: 'series@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

function setupAgencyContext() {
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
      data: { plan_key: 'agency', status: 'active' },
      error: null,
    },
  };
}

beforeEach(() => {
  adminTables = {};
  createSeriesMock.mockClear();
  listTemplatesMock.mockClear();
  getTemplateBySlugMock.mockClear();
  enableAutoProgressMock.mockClear();
  checkProgressTriggersMock.mockClear();
  generateConsistentEpisodeMock.mockClear();
  generateNarrativeArcMock.mockClear();
});

afterEach(() => {
  vi.resetModules();
});

const TEMPLATE_CATEGORIES = ['residencial', 'comercial', 'mixto', 'custom'] as const;

describe('Series path — listTemplates (4 templates canon by category)', () => {
  for (const category of TEMPLATE_CATEGORIES) {
    it(`lists templates filtered by category=${category}`, async () => {
      setupAgencyContext();
      const { studioSprint8SeriesRouter } = await import(
        '@/features/dmx-studio/routes/sprint8-series'
      );
      const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
      const result = await caller.listTemplates({ category });
      expect(Array.isArray(result.templates)).toBe(true);
      // Each filtered category returns at least 1 template canon.
      expect(result.templates.length).toBeGreaterThanOrEqual(1);
      const cats = new Set(result.templates.map((t) => t.category));
      expect(cats.has(category)).toBe(true);
    });
  }

  it('lists all templates when no category filter', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    const result = await caller.listTemplates({});
    expect(result.templates.length).toBe(4);
  });
});

describe('Series path — create + auto-progress flow', () => {
  it('creates series via lib + returns seriesId', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    const result = (await caller.create({
      title: 'Construccion Polanco',
      description: 'Serie 12 episodios',
      totalEpisodes: 12,
      enableAutoProgress: true,
    })) as { seriesId: string };
    expect(result.seriesId).toBe('aa000001-0001-4001-8001-000000000001');
    expect(createSeriesMock).toHaveBeenCalledWith(
      DEFAULT_USER_ID,
      expect.objectContaining({ title: 'Construccion Polanco', enableAutoProgress: true }),
    );
  });

  it('enableAutoProgress toggles auto-progression flag', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    const result = (await caller.enableAutoProgress({
      seriesId: DEFAULT_SERIES_ID,
      enabled: true,
    })) as unknown as { enabled: boolean };
    expect(result.enabled).toBe(true);
  });

  it('getProgressTriggers returns triggers list (cron auto-progress entrypoint)', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    const result = await caller.getProgressTriggers({ manual: true });
    expect(result.triggers.length).toBe(1);
  });
});

describe('Series path — multi-shot consistency', () => {
  it('generateConsistentEpisode delegates to multi-shot engine', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    const result = (await caller.generateConsistentEpisode({
      seriesId: DEFAULT_SERIES_ID,
      episodeId: DEFAULT_EPISODE_ID,
    })) as unknown as { consistencyScore: number; multiShotsGenerated: number };
    expect(result.consistencyScore).toBeGreaterThan(0.5);
    expect(result.multiShotsGenerated).toBe(5);
  });

  it('getNarrativeArc generates arc proportional to episodesCount', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    const result = (await caller.getNarrativeArc({
      seriesId: DEFAULT_SERIES_ID,
      episodesCount: 8,
    })) as unknown as { episodesCount: number; arc: ReadonlyArray<unknown> };
    expect(result.episodesCount).toBe(8);
    expect(result.arc.length).toBe(8);
  });
});

describe('Series path — paywall enforcement', () => {
  it('rejects FORBIDDEN when no Agency subscription', async () => {
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
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    await expect(caller.listTemplates({})).rejects.toThrow(/Agency/);
  });
});

describe('Series path — getTemplateBySlug NOT_FOUND path', () => {
  it('rejects NOT_FOUND when slug unknown', async () => {
    setupAgencyContext();
    const { studioSprint8SeriesRouter } = await import(
      '@/features/dmx-studio/routes/sprint8-series'
    );
    const caller = studioSprint8SeriesRouter.createCaller(buildCtx());
    await expect(caller.getTemplateBySlug({ slug: 'unknown-slug' })).rejects.toThrow(/NOT_FOUND/);
  });
});
