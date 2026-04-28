// FASE 14.F.12 Sprint 11+12 BIBLIA — Stripe products MXN canon tests.
// Verifica nuevos MXN price IDs + premium/basic limits per plan + helper functions
// + STUDIO_PRICE_TO_PLAN inverse map + legacy USD constants preservados.

import { describe, expect, it } from 'vitest';
import {
  getBasicLimit,
  getPremiumLimit,
  getStudioPlanByPriceId,
  getTotalVideoLimit,
  STUDIO_PLANS,
  STUDIO_PRICE_TO_PLAN,
  STUDIO_STRIPE_PRICE_AGENCY_MXN_5997,
  STUDIO_STRIPE_PRICE_AGENCY_USD_97_LEGACY_USD,
  STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C,
  STUDIO_STRIPE_PRICE_FOUNDER_MXN_997,
  STUDIO_STRIPE_PRICE_PRO_MXN_2497,
  STUDIO_STRIPE_PRICE_PRO_USD_47_LEGACY_USD,
} from '@/features/dmx-studio/lib/stripe-products';

describe('Canon MXN price IDs (FASE 14.F.12)', () => {
  it('Founder MXN 997 = price_1TR55ACdtMsDaBnLUwlPAeEo', () => {
    expect(STUDIO_STRIPE_PRICE_FOUNDER_MXN_997).toBe('price_1TR55ACdtMsDaBnLUwlPAeEo');
  });

  it('Pro MXN 2497 = price_1TR56BCdtMsDaBnLNa7X2WU4', () => {
    expect(STUDIO_STRIPE_PRICE_PRO_MXN_2497).toBe('price_1TR56BCdtMsDaBnLNa7X2WU4');
  });

  it('Agency MXN 5997 = price_1TR52HCdtMsDaBnLxBiXViKi', () => {
    expect(STUDIO_STRIPE_PRICE_AGENCY_MXN_5997).toBe('price_1TR52HCdtMsDaBnLxBiXViKi');
  });
});

describe('Legacy USD constants preserved (backwards compat H0)', () => {
  it('Legacy Pro USD 47 still exported with _LEGACY_USD suffix', () => {
    expect(STUDIO_STRIPE_PRICE_PRO_USD_47_LEGACY_USD).toBe('price_1TQl2xCdtMsDaBnL2wzRlICK');
  });

  it('Legacy Agency USD 97 still exported with _LEGACY_USD suffix', () => {
    expect(STUDIO_STRIPE_PRICE_AGENCY_USD_97_LEGACY_USD).toBe('price_1TQl2zCdtMsDaBnLmq9QoA2v');
  });

  it('Legacy Foto B2B2C photographer 67 USD preserved standalone', () => {
    expect(STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C).toBe(
      'price_1TQl2yCdtMsDaBnLKVAZbarz',
    );
  });
});

describe('STUDIO_PLANS canon FASE 14.F.12', () => {
  it('contains exactly 3 keys: founder/pro/agency', () => {
    const keys = Object.keys(STUDIO_PLANS).sort();
    expect(keys).toEqual(['agency', 'founder', 'pro']);
  });

  it('founder plan: $997 MXN, 5 total (2 premium + 3 basic)', () => {
    expect(STUDIO_PLANS.founder.priceMxn).toBe(997);
    expect(STUDIO_PLANS.founder.videosTotalLimit).toBe(5);
    expect(STUDIO_PLANS.founder.premiumVideosLimit).toBe(2);
    expect(STUDIO_PLANS.founder.basicVideosLimit).toBe(3);
    expect(STUDIO_PLANS.founder.priceId).toBe(STUDIO_STRIPE_PRICE_FOUNDER_MXN_997);
  });

  it('pro plan: $2497 MXN, 15 total (5 premium + 10 basic)', () => {
    expect(STUDIO_PLANS.pro.priceMxn).toBe(2497);
    expect(STUDIO_PLANS.pro.videosTotalLimit).toBe(15);
    expect(STUDIO_PLANS.pro.premiumVideosLimit).toBe(5);
    expect(STUDIO_PLANS.pro.basicVideosLimit).toBe(10);
    expect(STUDIO_PLANS.pro.priceId).toBe(STUDIO_STRIPE_PRICE_PRO_MXN_2497);
  });

  it('agency plan: $5997 MXN, 50 total (20 premium + 30 basic)', () => {
    expect(STUDIO_PLANS.agency.priceMxn).toBe(5997);
    expect(STUDIO_PLANS.agency.videosTotalLimit).toBe(50);
    expect(STUDIO_PLANS.agency.premiumVideosLimit).toBe(20);
    expect(STUDIO_PLANS.agency.basicVideosLimit).toBe(30);
    expect(STUDIO_PLANS.agency.priceId).toBe(STUDIO_STRIPE_PRICE_AGENCY_MXN_5997);
  });

  it('agency plan features include reseller_mode_toggle + ia_dmx_bundled + multi_user_seats_10', () => {
    expect(STUDIO_PLANS.agency.features).toContain('reseller_mode_toggle');
    expect(STUDIO_PLANS.agency.features).toContain('ia_dmx_bundled');
    expect(STUDIO_PLANS.agency.features).toContain('multi_user_seats_10');
  });

  it('all plans expose dmx_crm_bundled feature', () => {
    expect(STUDIO_PLANS.founder.features).toContain('dmx_crm_bundled');
    expect(STUDIO_PLANS.pro.features).toContain('dmx_crm_bundled');
    expect(STUDIO_PLANS.agency.features).toContain('dmx_crm_bundled');
  });

  it('founder plan exposes founders_cohort_100 feature', () => {
    expect(STUDIO_PLANS.founder.features).toContain('founders_cohort_100');
  });

  it('all plans expose videosPerMonth alias matching videosTotalLimit (backwards compat webhook)', () => {
    expect(STUDIO_PLANS.founder.videosPerMonth).toBe(STUDIO_PLANS.founder.videosTotalLimit);
    expect(STUDIO_PLANS.pro.videosPerMonth).toBe(STUDIO_PLANS.pro.videosTotalLimit);
    expect(STUDIO_PLANS.agency.videosPerMonth).toBe(STUDIO_PLANS.agency.videosTotalLimit);
  });

  it('priceUsdEquivalent populated for all plans (≈ priceMxn / 17)', () => {
    expect(STUDIO_PLANS.founder.priceUsdEquivalent).toBeGreaterThan(0);
    expect(STUDIO_PLANS.pro.priceUsdEquivalent).toBeGreaterThan(0);
    expect(STUDIO_PLANS.agency.priceUsdEquivalent).toBeGreaterThan(0);
  });
});

describe('STUDIO_PRICE_TO_PLAN inverse map', () => {
  it('maps founder MXN price ID → founder', () => {
    expect(STUDIO_PRICE_TO_PLAN[STUDIO_STRIPE_PRICE_FOUNDER_MXN_997]).toBe('founder');
  });

  it('maps pro MXN price ID → pro', () => {
    expect(STUDIO_PRICE_TO_PLAN[STUDIO_STRIPE_PRICE_PRO_MXN_2497]).toBe('pro');
  });

  it('maps agency MXN price ID → agency', () => {
    expect(STUDIO_PRICE_TO_PLAN[STUDIO_STRIPE_PRICE_AGENCY_MXN_5997]).toBe('agency');
  });

  it('does NOT map legacy USD or foto B2B2C price IDs (canon main tier MXN only)', () => {
    expect(STUDIO_PRICE_TO_PLAN[STUDIO_STRIPE_PRICE_PRO_USD_47_LEGACY_USD]).toBeUndefined();
    expect(STUDIO_PRICE_TO_PLAN[STUDIO_STRIPE_PRICE_AGENCY_USD_97_LEGACY_USD]).toBeUndefined();
    expect(
      STUDIO_PRICE_TO_PLAN[STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C],
    ).toBeUndefined();
  });
});

describe('getStudioPlanByPriceId', () => {
  it('returns founder plan for MXN founder price ID', () => {
    const p = getStudioPlanByPriceId(STUDIO_STRIPE_PRICE_FOUNDER_MXN_997);
    expect(p?.key).toBe('founder');
  });

  it('returns undefined for unknown price ID', () => {
    expect(getStudioPlanByPriceId('price_unknown_xyz')).toBeUndefined();
  });
});

describe('Helper functions premium/basic/total', () => {
  it('getPremiumLimit founder=2, pro=5, agency=20', () => {
    expect(getPremiumLimit('founder')).toBe(2);
    expect(getPremiumLimit('pro')).toBe(5);
    expect(getPremiumLimit('agency')).toBe(20);
  });

  it('getBasicLimit founder=3, pro=10, agency=30', () => {
    expect(getBasicLimit('founder')).toBe(3);
    expect(getBasicLimit('pro')).toBe(10);
    expect(getBasicLimit('agency')).toBe(30);
  });

  it('getTotalVideoLimit founder=5, pro=15, agency=50', () => {
    expect(getTotalVideoLimit('founder')).toBe(5);
    expect(getTotalVideoLimit('pro')).toBe(15);
    expect(getTotalVideoLimit('agency')).toBe(50);
  });

  it('premium + basic = total per plan (invariant)', () => {
    for (const key of ['founder', 'pro', 'agency'] as const) {
      expect(getPremiumLimit(key) + getBasicLimit(key)).toBe(getTotalVideoLimit(key));
    }
  });
});
