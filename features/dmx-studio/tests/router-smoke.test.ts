import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports the 25 expected namespaces (Sprint 0-4: baseline + library/multiFormat/usage + url-import/copyPack/copyVersions/listingHealth + crossFunctions + Sprint 4 calendar/remarketing/batchMode/streaks/notifications/challenges/aiCoach)', async () => {
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
        'dashboard',
        'foundersCohort',
        'landing',
        'library',
        'listingHealth',
        'multiFormat',
        'notifications',
        'onboarding',
        'projects',
        'publicGallery',
        'remarketing',
        'streaks',
        'subscriptions',
        'urlImport',
        'usage',
        'voiceClones',
        'waitlist',
      ].sort(),
    );
  });
});
