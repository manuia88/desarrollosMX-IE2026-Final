// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Avatar HeyGen + Galería + Analytics + Zone path.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre: studioSprint7AvatarsRouter (Agency-only) + studioSprint7PublicGalleryRouter (publicProcedure)
//   + studioSprint7ZoneVideosRouter + studioSprint7AnalyticsRouter.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

vi.mock('@/features/dmx-studio/lib/cross-functions/m03-referral-lead-create', () => ({
  createLeadFromReferral: vi.fn(async () => ({ leadId: 'lead_x' })),
}));

vi.mock('@/shared/lib/ie-cross-feature', () => ({
  getZoneScores: vi.fn(async () => ({ life: 80, investment: 75, mobility: 70 })),
  getZoneMarketData: vi.fn(async () => ({
    rentMedian: 25000,
    salesMedian: 7_500_000,
  })),
  suggestZonesForAsesor: vi.fn(async () => [
    { zoneId: 'zone-1', score: 85, reason: 'top_3_closed_deals' },
  ]),
}));

interface AdminTableState {
  selectMaybeSingle?: { data: Record<string, unknown> | null; error: unknown };
  selectList?: { data: Array<Record<string, unknown>>; error: unknown };
  insertResult?: { data: Record<string, unknown> | null; error: unknown };
  upsertResult?: { data: Array<Record<string, unknown>>; error: unknown };
  updateResult?: { error: unknown };
  countResult?: { count: number; error: unknown };
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
  builder.then = (resolve: (v: { data: unknown[]; error: unknown; count?: number }) => void) => {
    if (state?.countResult) {
      resolve({
        data: [],
        error: state.countResult.error,
        count: state.countResult.count,
      });
    } else {
      resolve(state?.selectList ?? { data: [], error: null });
    }
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
  });
  // biome-ignore lint/suspicious/noThenProperty: thenable result
  builder.then = (resolve: (v: { error: unknown }) => void) => {
    resolve({ error: state?.insertResult?.error ?? null });
  };
  return builder;
}

function makeUpsertChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  builder.select = () => {
    const inner: Record<string, unknown> = {};
    // biome-ignore lint/suspicious/noThenProperty: thenable list
    inner.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
      resolve(state?.upsertResult ?? { data: [{ id: 'upserted_id' }], error: null });
    };
    return inner;
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
        upsert() {
          return makeUpsertChain(state);
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
    rpc: vi.fn(() => ({
      // biome-ignore lint/suspicious/noThenProperty: thenable mock for supabase.rpc shape
      then(resolve: (v: { data: unknown; error: unknown }) => void) {
        resolve({ data: null, error: null });
      },
    })),
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_AVATAR_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_ZONE_ID = 'ee555555-5555-4555-8555-555555555555';

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
    user: { id: DEFAULT_USER_ID, email: 'avatar@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

function setupStudioContext() {
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
}

function setupAgencyContext() {
  setupStudioContext();
  adminTables.studio_subscriptions = {
    selectMaybeSingle: {
      data: { plan_key: 'agency', status: 'active' },
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

describe('Avatar path — studioSprint7AvatarsRouter (Agency-only)', () => {
  it('startOnboarding inserts avatar row when no existing avatar (Agency)', async () => {
    setupAgencyContext();
    adminTables.studio_avatars = {
      selectMaybeSingle: { data: null, error: null },
      insertResult: { data: { id: DEFAULT_AVATAR_ID, status: 'pending' }, error: null },
    };
    const { studioSprint7AvatarsRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-avatars'
    );
    const caller = studioSprint7AvatarsRouter.createCaller(buildCtx());
    const result = await caller.startOnboarding({
      photoStoragePath: 'avatar/photo.jpg',
      voiceSampleStoragePath: 'avatar/voice.mp3',
      name: 'Manuel Asesor',
    });
    expect(result.avatarId).toBe(DEFAULT_AVATAR_ID);
    expect(result.status).toBe('pending');
  });

  it('startOnboarding rejects FORBIDDEN when not on Agency plan', async () => {
    setupStudioContext();
    adminTables.studio_subscriptions = {
      selectMaybeSingle: { data: { plan_key: 'pro', status: 'active' }, error: null },
    };
    const { studioSprint7AvatarsRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-avatars'
    );
    const caller = studioSprint7AvatarsRouter.createCaller(buildCtx());
    await expect(
      caller.startOnboarding({
        photoStoragePath: 'avatar/photo.jpg',
        voiceSampleStoragePath: 'avatar/voice.mp3',
        name: 'Manuel Asesor',
      }),
    ).rejects.toThrow(/Agency/);
  });

  it('generateVariants requires avatar status=ready (PRECONDITION_FAILED otherwise)', async () => {
    setupAgencyContext();
    adminTables.studio_avatars = {
      selectMaybeSingle: {
        data: { id: DEFAULT_AVATAR_ID, status: 'pending' },
        error: null,
      },
    };
    const { studioSprint7AvatarsRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-avatars'
    );
    const caller = studioSprint7AvatarsRouter.createCaller(buildCtx());
    await expect(
      caller.generateVariants({
        avatarId: DEFAULT_AVATAR_ID,
        styles: ['formal', 'casual', 'branded'],
      }),
    ).rejects.toThrow(/ready/);
  });

  it('generateVariants succeeds with all 3 styles canon when avatar ready', async () => {
    setupAgencyContext();
    adminTables.studio_avatars = {
      selectMaybeSingle: {
        data: { id: DEFAULT_AVATAR_ID, status: 'ready' },
        error: null,
      },
    };
    adminTables.studio_avatar_variants = {
      upsertResult: {
        data: [
          { id: 'v1', style: 'formal', is_default: true },
          { id: 'v2', style: 'casual', is_default: false },
          { id: 'v3', style: 'branded', is_default: false },
        ],
        error: null,
      },
    };
    const { studioSprint7AvatarsRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-avatars'
    );
    const caller = studioSprint7AvatarsRouter.createCaller(buildCtx());
    const result = (await caller.generateVariants({
      avatarId: DEFAULT_AVATAR_ID,
      styles: ['formal', 'casual', 'branded'],
    })) as { variants: ReadonlyArray<{ style: string }> };
    expect(result.variants.length).toBe(3);
    const styles = result.variants.map((v) => v.style).sort();
    expect(styles).toEqual(['branded', 'casual', 'formal']);
  });
});

describe('Galería path — studioSprint7PublicGalleryRouter (publicProcedure)', () => {
  it('getBySlug returns gallery + brandKit + avatar when active', async () => {
    adminTables.studio_public_galleries = {
      selectMaybeSingle: {
        data: {
          id: 'g1',
          user_id: DEFAULT_USER_ID,
          slug: 'asesor-mx',
          title: 'Manu Asesor',
          bio: 'Bienes raíces CDMX',
          cover_image_url: null,
          featured_video_ids: [],
          view_count: 100,
          meta: {},
        },
        error: null,
      },
    };
    adminTables.studio_brand_kits = {
      selectMaybeSingle: {
        data: { display_name: 'Manu', tagline: 'Tu asesor', primary_color: '#6366F1' },
        error: null,
      },
    };
    adminTables.studio_avatars = {
      selectMaybeSingle: {
        data: { source_photo_storage_path: 'avatar.jpg', status: 'ready' },
        error: null,
      },
    };
    const { studioSprint7PublicGalleryRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-public-gallery'
    );
    const caller = studioSprint7PublicGalleryRouter.createCaller(buildCtx());
    const result = await caller.getBySlug({ slug: 'asesor-mx' });
    expect(result.gallery.slug).toBe('asesor-mx');
    expect(result.brandKit?.display_name).toBe('Manu');
    expect(result.avatar?.status).toBe('ready');
  });

  it('getBySlug NOT_FOUND when slug missing or is_active=false', async () => {
    adminTables.studio_public_galleries = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioSprint7PublicGalleryRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-public-gallery'
    );
    const caller = studioSprint7PublicGalleryRouter.createCaller(buildCtx());
    await expect(caller.getBySlug({ slug: 'unknown' })).rejects.toThrow(/NOT_FOUND/);
  });

  it('listVideos returns latest 12 when no featured_video_ids', async () => {
    adminTables.studio_public_galleries = {
      selectMaybeSingle: {
        data: { user_id: DEFAULT_USER_ID, featured_video_ids: [] },
        error: null,
      },
    };
    adminTables.studio_video_outputs = {
      selectList: {
        data: [
          { id: 'v1', hook_variant: 'hook_a', format: '9x16', storage_url: 'v1.mp4' },
          { id: 'v2', hook_variant: 'hook_b', format: '9x16', storage_url: 'v2.mp4' },
        ],
        error: null,
      },
    };
    const { studioSprint7PublicGalleryRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-public-gallery'
    );
    const caller = studioSprint7PublicGalleryRouter.createCaller(buildCtx());
    const result = await caller.listVideos({ slug: 'asesor-mx' });
    expect(result.videos.length).toBe(2);
  });
});

describe('Analytics path — studioSprint7GalleryAnalyticsRouter.getPublicStats', () => {
  it('returns viewsLast30d + leadsLast30d + totalViewsAllTime when gallery active', async () => {
    adminTables.studio_public_galleries = {
      selectMaybeSingle: {
        data: { user_id: DEFAULT_USER_ID, view_count: 150, slug: 'asesor-mx' },
        error: null,
      },
    };
    adminTables.studio_gallery_views_log = {
      countResult: { count: 25, error: null },
    };
    adminTables.studio_referral_form_submissions = {
      countResult: { count: 5, error: null },
    };
    const { studioSprint7GalleryAnalyticsRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-gallery-analytics'
    );
    const caller = studioSprint7GalleryAnalyticsRouter.createCaller(buildCtx());
    const result = await caller.getPublicStats({ asesorSlug: 'asesor-mx' });
    expect(result.slug).toBe('asesor-mx');
    expect(result.totalViewsAllTime).toBe(150);
  });

  it('rejects NOT_FOUND when gallery missing', async () => {
    adminTables.studio_public_galleries = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioSprint7GalleryAnalyticsRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-gallery-analytics'
    );
    const caller = studioSprint7GalleryAnalyticsRouter.createCaller(buildCtx());
    await expect(caller.getPublicStats({ asesorSlug: 'missing' })).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('Zone videos path — studioSprint7ZoneVideosRouter', () => {
  it('getZoneSuggestions returns IE suggestions wrapper', async () => {
    setupStudioContext();
    const { studioSprint7ZoneVideosRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-zone-videos'
    );
    const caller = studioSprint7ZoneVideosRouter.createCaller(buildCtx());
    const result = await caller.getZoneSuggestions();
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBe(1);
  });

  it('getIeScoresForZone returns scores + market data', async () => {
    setupStudioContext();
    const { studioSprint7ZoneVideosRouter } = await import(
      '@/features/dmx-studio/routes/sprint7-zone-videos'
    );
    const caller = studioSprint7ZoneVideosRouter.createCaller(buildCtx());
    const result = (await caller.getIeScoresForZone({
      zoneId: DEFAULT_ZONE_ID,
    })) as unknown as {
      scores: { life: number };
      market: { rentMedian: number };
    };
    expect(result.scores.life).toBe(80);
    expect(result.market.rentMedian).toBe(25000);
  });
});

describe('Avatar/Galería module export smoke', () => {
  it('exports expected routers', async () => {
    const avatars = await import('@/features/dmx-studio/routes/sprint7-avatars');
    const gallery = await import('@/features/dmx-studio/routes/sprint7-public-gallery');
    const analytics = await import('@/features/dmx-studio/routes/sprint7-gallery-analytics');
    const zoneVideos = await import('@/features/dmx-studio/routes/sprint7-zone-videos');
    expect(avatars.studioSprint7AvatarsRouter).toBeDefined();
    expect(gallery.studioSprint7PublicGalleryRouter).toBeDefined();
    expect(analytics.studioSprint7GalleryAnalyticsRouter).toBeDefined();
    expect(zoneVideos.studioSprint7ZoneVideosRouter).toBeDefined();
  });
});
