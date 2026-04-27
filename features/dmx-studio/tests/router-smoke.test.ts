import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports the 13 expected namespaces (Sprint 1 baseline + Sprint 2 library/multiFormat/usage)', async () => {
    const mod = await import('../routes/studio');
    const r = mod.studioRouter as unknown as { _def: { record: Record<string, unknown> } };
    const names = Object.keys(r._def.record);
    expect(names.sort()).toEqual(
      [
        'brandKit',
        'dashboard',
        'foundersCohort',
        'landing',
        'library',
        'multiFormat',
        'onboarding',
        'projects',
        'publicGallery',
        'subscriptions',
        'usage',
        'voiceClones',
        'waitlist',
      ].sort(),
    );
  });
});
