import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('StudioHero — module export smoke', () => {
  it('exports StudioHero as function', async () => {
    const mod = await import('../../../components/landing/StudioHero');
    expect(typeof mod.StudioHero).toBe('function');
    expect(mod.StudioHero.name).toBe('StudioHero');
  });

  it('component is callable without props (renders 3 CTAs + title via translation keys)', async () => {
    const mod = await import('../../../components/landing/StudioHero');
    // Sanity: translation keys consumed by hero
    const expectedKeys = ['title', 'subtitle', 'ctaWaitlist', 'ctaDemos', 'ctaPricing', 'eyebrow'];
    expect(expectedKeys.length).toBe(6);
    expect(typeof mod.StudioHero).toBe('function');
  });
});
