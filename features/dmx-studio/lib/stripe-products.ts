// DMX Studio Stripe products canon (BIBLIA v4 + ADR-054 lock canon).
// DMX Studio dentro DMX único entorno: Stripe account compartido con DMX core.
// Bundle pricing canon ADR-008: subscriptions.product_id mapea a tier_studio.
//
// FASE 14.F.12 (2026-04-28) — Pricing escala masiva MXN canon founder:
//   - Founder $997 MXN/mes: 5 videos (2 premium + 3 basic) + DMX CRM + 100 grandfathered cohort
//   - Pro $2,497 MXN/mes: 15 videos (5 premium + 10 basic) + DMX CRM
//   - Agency $5,997 MXN/mes: 50 videos (20 premium + 30 basic) + DMX CRM + Multi-user 10 + Modo Reseller toggle + IA DMX bundled
//
// Constants USD viejos preservados con suffix _LEGACY_USD para backwards compat
// (suscriptores históricos H0 + tests legacy). Plan 'foto' B2B2C photographer
// (F14.F.10) también preservado como constant suelta — NO es parte de
// STUDIO_PLANS main tier.

// === Canon MXN price IDs (FASE 14.F.12) ===
export const STUDIO_STRIPE_PRICE_FOUNDER_MXN_997 = 'price_1TR55ACdtMsDaBnLUwlPAeEo';
export const STUDIO_STRIPE_PRICE_PRO_MXN_2497 = 'price_1TR56BCdtMsDaBnLNa7X2WU4';
export const STUDIO_STRIPE_PRICE_AGENCY_MXN_5997 = 'price_1TR52HCdtMsDaBnLxBiXViKi';

// === Legacy USD price IDs (preservados — backwards compat suscriptores H0) ===
export const STUDIO_STRIPE_PRICE_PRO_USD_47_LEGACY_USD = 'price_1TQl2xCdtMsDaBnL2wzRlICK';
export const STUDIO_STRIPE_PRICE_AGENCY_USD_97_LEGACY_USD = 'price_1TQl2zCdtMsDaBnLmq9QoA2v';

// === Photographer B2B2C standalone (F14.F.10 Plan Foto $67 USD) ===
// NO es parte de STUDIO_PLANS main tier — flujo separado Sprint 9 photographer.
export const STUDIO_STRIPE_PRICE_FOTO_USD_67_LEGACY_PHOTOGRAPHER_B2B2C =
  'price_1TQl2yCdtMsDaBnLKVAZbarz';

export type StudioPlanKey = 'founder' | 'pro' | 'agency';

export interface StudioPlan {
  readonly key: StudioPlanKey;
  readonly name: string;
  readonly priceId: string;
  readonly priceMxn: number;
  readonly priceUsdEquivalent: number | null;
  readonly videosTotalLimit: number;
  readonly premiumVideosLimit: number;
  readonly basicVideosLimit: number;
  // Backwards compat alias for webhook / dashboards reading total monthly limit.
  readonly videosPerMonth: number;
  readonly features: readonly string[];
}

// Approximate USD equivalent at MXN 17/USD (informational only, not used for billing).
const MXN_PER_USD_APPROX = 17;
function usdFromMxn(mxn: number): number {
  return Math.round((mxn / MXN_PER_USD_APPROX) * 100) / 100;
}

export const STUDIO_PLANS: Readonly<Record<StudioPlanKey, StudioPlan>> = {
  founder: {
    key: 'founder',
    name: 'DMX Studio Founder',
    priceId: STUDIO_STRIPE_PRICE_FOUNDER_MXN_997,
    priceMxn: 997,
    priceUsdEquivalent: usdFromMxn(997),
    videosTotalLimit: 5,
    premiumVideosLimit: 2,
    basicVideosLimit: 3,
    videosPerMonth: 5,
    features: [
      'video_render_kling',
      'voice_narration_elevenlabs',
      'copy_pack_basic',
      'hooks_3_variants',
      'dmx_crm_bundled',
      'founders_cohort_100',
    ],
  },
  pro: {
    key: 'pro',
    name: 'DMX Studio Pro',
    priceId: STUDIO_STRIPE_PRICE_PRO_MXN_2497,
    priceMxn: 2497,
    priceUsdEquivalent: usdFromMxn(2497),
    videosTotalLimit: 15,
    premiumVideosLimit: 5,
    basicVideosLimit: 10,
    videosPerMonth: 15,
    features: [
      'video_render_kling',
      'voice_narration_elevenlabs',
      'copy_pack_full',
      'hooks_3_variants',
      'series_mode',
      'dmx_crm_bundled',
    ],
  },
  agency: {
    key: 'agency',
    name: 'DMX Studio Agency',
    priceId: STUDIO_STRIPE_PRICE_AGENCY_MXN_5997,
    priceMxn: 5997,
    priceUsdEquivalent: usdFromMxn(5997),
    videosTotalLimit: 50,
    premiumVideosLimit: 20,
    basicVideosLimit: 30,
    videosPerMonth: 50,
    features: [
      'video_render_kling',
      'voice_narration_elevenlabs',
      'copy_pack_full',
      'hooks_3_variants',
      'series_mode',
      'voice_clone_elevenlabs',
      'virtual_staging',
      'multi_user_seats_10',
      'reseller_mode_toggle',
      'ia_dmx_bundled',
      'dmx_crm_bundled',
    ],
  },
} as const;

export const STUDIO_PRICE_TO_PLAN: Readonly<Record<string, StudioPlanKey>> = {
  [STUDIO_STRIPE_PRICE_FOUNDER_MXN_997]: 'founder',
  [STUDIO_STRIPE_PRICE_PRO_MXN_2497]: 'pro',
  [STUDIO_STRIPE_PRICE_AGENCY_MXN_5997]: 'agency',
} as const;

export function getStudioPlanByPriceId(priceId: string): StudioPlan | undefined {
  const key = STUDIO_PRICE_TO_PLAN[priceId];
  return key ? STUDIO_PLANS[key] : undefined;
}

// === Helpers premium/basic video category limits (FASE 14.F.12) ===

export function getPremiumLimit(planKey: StudioPlanKey): number {
  return STUDIO_PLANS[planKey].premiumVideosLimit;
}

export function getBasicLimit(planKey: StudioPlanKey): number {
  return STUDIO_PLANS[planKey].basicVideosLimit;
}

export function getTotalVideoLimit(planKey: StudioPlanKey): number {
  return STUDIO_PLANS[planKey].videosTotalLimit;
}
