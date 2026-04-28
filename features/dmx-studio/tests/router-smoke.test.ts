import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports expected namespaces (Sprint 0-12: baseline + Sprint 5 video crudo + Sprint 6 seedance/staging/drone/cinema/toggles + Sprint 7 avatars/galleryAnalytics/publicGallery/zoneVideos/analytics + Sprint 8 series/publicSeries + Sprint 9 photographer + Sprint 10 feedback/healthCheck/qaReport + Sprint 11+12 socialPublishers STUB)', async () => {
    const mod = await import('../routes/studio');
    const r = mod.studioRouter as unknown as { _def: { record: Record<string, unknown> } };
    const names = Object.keys(r._def.record);
    expect(names.sort()).toEqual(
      [
        'aiCoach',
        'batchMode',
        'brandKit',
        'calendar',
        'challenges',
        'cinemaMode',
        'copyPack',
        'copyVersions',
        'crossFunctions',
        'cuts',
        'dashboard',
        'drone',
        'edl',
        'foundersCohort',
        'highlightReels',
        'landing',
        'library',
        'listingHealth',
        'multiFormat',
        'notifications',
        'onboarding',
        'projects',
        'publicGallery',
        'rawVideoPipeline',
        'rawVideos',
        'remarketing',
        'seedance',
        'socialPublishers',
        'speechAnalytics',
        'sprint6Toggles',
        'sprint7Analytics',
        'sprint7Avatars',
        'sprint7GalleryAnalytics',
        'sprint7PublicGallery',
        'sprint7ZoneVideos',
        'sprint8PublicSeries',
        'sprint8Series',
        'sprint9Photographer',
        'sprint10Feedback',
        'sprint10HealthCheck',
        'sprint10QaReport',
        'streaks',
        'subscriptions',
        'subtitles',
        'urlImport',
        'usage',
        'virtualStaging',
        'voiceClones',
        'waitlist',
      ].sort(),
    );
  });
});
