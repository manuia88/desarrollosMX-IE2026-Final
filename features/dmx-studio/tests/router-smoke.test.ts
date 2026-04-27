import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports the 18 expected namespaces (Sprint 0-3: baseline + library/multiFormat/usage + url-import/copyPack/copyVersions/listingHealth + crossFunctions)', async () => {
    const mod = await import('../routes/studio');
    const r = mod.studioRouter as unknown as { _def: { record: Record<string, unknown> } };
    const names = Object.keys(r._def.record);
    expect(names.sort()).toEqual(
      [
        'brandKit',
        'copyPack',
        'copyVersions',
        'crossFunctions',
        'dashboard',
        'foundersCohort',
        'landing',
        'library',
        'listingHealth',
        'multiFormat',
        'onboarding',
        'projects',
        'publicGallery',
        'subscriptions',
        'urlImport',
        'usage',
        'voiceClones',
        'waitlist',
      ].sort(),
    );
  });
});
