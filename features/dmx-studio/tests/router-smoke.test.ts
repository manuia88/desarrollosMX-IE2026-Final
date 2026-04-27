import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('studioRouter — module export smoke', () => {
  it('exports the 10 expected namespaces (Sprint 1: 6 baseline + dashboard/onboarding/projects/voiceClones)', async () => {
    const mod = await import('../routes/studio');
    const r = mod.studioRouter as unknown as { _def: { record: Record<string, unknown> } };
    const names = Object.keys(r._def.record);
    expect(names.sort()).toEqual(
      [
        'brandKit',
        'dashboard',
        'foundersCohort',
        'landing',
        'onboarding',
        'projects',
        'publicGallery',
        'subscriptions',
        'voiceClones',
        'waitlist',
      ].sort(),
    );
  });
});
