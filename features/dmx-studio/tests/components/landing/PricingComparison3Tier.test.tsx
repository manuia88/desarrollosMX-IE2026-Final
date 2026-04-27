import { describe, expect, it, vi } from 'vitest';
import { STUDIO_PLANS } from '@/features/dmx-studio/lib/stripe-products';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('PricingComparison3Tier — module export smoke', () => {
  it('exports PricingComparison3Tier as function', async () => {
    const mod = await import('../../../components/landing/PricingComparison3Tier');
    expect(typeof mod.PricingComparison3Tier).toBe('function');
    expect(mod.PricingComparison3Tier.name).toBe('PricingComparison3Tier');
  });

  it('STUDIO_PLANS source-of-truth contains 3 tiers (pro/foto/agency)', () => {
    const keys = Object.keys(STUDIO_PLANS).sort();
    expect(keys).toEqual(['agency', 'foto', 'pro']);
  });

  it('annual cycle applies 20% discount to monthly USD price', () => {
    // mirrors effectivePriceUsd helper
    const ANNUAL_DISCOUNT = 0.2;
    const annualPro = Math.round(STUDIO_PLANS.pro.priceUsd * (1 - ANNUAL_DISCOUNT));
    const annualFoto = Math.round(STUDIO_PLANS.foto.priceUsd * (1 - ANNUAL_DISCOUNT));
    const annualAgency = Math.round(STUDIO_PLANS.agency.priceUsd * (1 - ANNUAL_DISCOUNT));
    // Pro = 47 → 38, Foto = 67 → 54, Agency = 97 → 78
    expect(annualPro).toBe(38);
    expect(annualFoto).toBe(54);
    expect(annualAgency).toBe(78);
    // Monthly equals priceUsd
    expect(STUDIO_PLANS.pro.priceUsd).toBe(47);
    expect(STUDIO_PLANS.foto.priceUsd).toBe(67);
    expect(STUDIO_PLANS.agency.priceUsd).toBe(97);
  });
});
