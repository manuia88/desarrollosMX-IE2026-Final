import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports expected namespaces (Sprint 0-5: baseline + Sprint 5 raw videos + edl + cuts + speech-analytics + subtitles + highlight-reels)', async () => {
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
        'copyPack',
        'copyVersions',
        'crossFunctions',
        'cuts',
        'dashboard',
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
        'speechAnalytics',
        'streaks',
        'subscriptions',
        'subtitles',
        'urlImport',
        'usage',
        'voiceClones',
        'waitlist',
      ].sort(),
    );
  });
});
