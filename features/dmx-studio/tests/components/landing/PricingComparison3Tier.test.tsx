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

  it('STUDIO_PLANS source-of-truth contains 3 tiers (founder/pro/agency)', () => {
    const keys = Object.keys(STUDIO_PLANS).sort();
    expect(keys).toEqual(['agency', 'founder', 'pro']);
  });

  it('annual cycle applies 20% discount to monthly MXN price', () => {
    // mirrors effectivePriceMxn helper
    const ANNUAL_DISCOUNT = 0.2;
    const annualFounder = Math.round(STUDIO_PLANS.founder.priceMxn * (1 - ANNUAL_DISCOUNT));
    const annualPro = Math.round(STUDIO_PLANS.pro.priceMxn * (1 - ANNUAL_DISCOUNT));
    const annualAgency = Math.round(STUDIO_PLANS.agency.priceMxn * (1 - ANNUAL_DISCOUNT));
    // Founder = 997 → 798, Pro = 2497 → 1998, Agency = 5997 → 4798
    expect(annualFounder).toBe(798);
    expect(annualPro).toBe(1998);
    expect(annualAgency).toBe(4798);
    // Monthly MXN canon FASE 14.F.12
    expect(STUDIO_PLANS.founder.priceMxn).toBe(997);
    expect(STUDIO_PLANS.pro.priceMxn).toBe(2497);
    expect(STUDIO_PLANS.agency.priceMxn).toBe(5997);
  });
});
