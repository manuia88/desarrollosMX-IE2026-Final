import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports expected namespaces (Sprint 0-8: baseline + Sprint 5 video crudo + Sprint 6 seedance/staging/drone/cinema/toggles + Sprint 7 avatars/galleryAnalytics/publicGallery/zoneVideos/analytics + Sprint 8 series/publicSeries)', async () => {
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
        'speechAnalytics',
        'sprint6Toggles',
        'sprint7Analytics',
        'sprint7Avatars',
        'sprint7GalleryAnalytics',
        'sprint7PublicGallery',
        'sprint7ZoneVideos',
        'sprint8PublicSeries',
        'sprint8Series',
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
