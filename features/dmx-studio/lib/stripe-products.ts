// DMX Studio Stripe products canon (BIBLIA v4 + ADR-054 lock canon).
// DMX Studio dentro DMX único entorno: Stripe account compartido con DMX core.
// Bundle pricing canon ADR-008: subscriptions.product_id mapea a tier_studio.

export const STUDIO_STRIPE_PRICE_PRO_USD_47 = 'price_1TQl2xCdtMsDaBnL2wzRlICK';
export const STUDIO_STRIPE_PRICE_FOTO_USD_67 = 'price_1TQl2yCdtMsDaBnLKVAZbarz';
export const STUDIO_STRIPE_PRICE_AGENCY_USD_97 = 'price_1TQl2zCdtMsDaBnLmq9QoA2v';

export type StudioPlanKey = 'pro' | 'foto' | 'agency';

export interface StudioPlan {
  key: StudioPlanKey;
  name: string;
  priceId: string;
  priceUsd: number;
  videosPerMonth: number;
  features: readonly string[];
}

export const STUDIO_PLANS: Readonly<Record<StudioPlanKey, StudioPlan>> = {
  pro: {
    key: 'pro',
    name: 'DMX Studio Pro',
    priceId: STUDIO_STRIPE_PRICE_PRO_USD_47,
    priceUsd: 47,
    videosPerMonth: 5,
    features: [
      'video_render_kling',
      'voice_narration_elevenlabs',
      'copy_pack_basic',
      'hooks_3_variants',
      'dmx_branding',
    ],
  },
  foto: {
    key: 'foto',
    name: 'DMX Studio Foto',
    priceId: STUDIO_STRIPE_PRICE_FOTO_USD_67,
    priceUsd: 67,
    videosPerMonth: 50,
    features: ['photo_pack_50', 'no_branding', 'voice_narration_elevenlabs', 'copy_pack_basic'],
  },
  agency: {
    key: 'agency',
    name: 'DMX Studio Agency',
    priceId: STUDIO_STRIPE_PRICE_AGENCY_USD_97,
    priceUsd: 97,
    videosPerMonth: 20,
    features: [
      'video_render_kling',
      'voice_narration_elevenlabs',
      'copy_pack_full',
      'hooks_3_variants',
      'series_mode',
      'voice_clone_elevenlabs',
      'virtual_staging',
      'multi_user_seats',
    ],
  },
} as const;

export const STUDIO_PRICE_TO_PLAN: Readonly<Record<string, StudioPlanKey>> = {
  [STUDIO_STRIPE_PRICE_PRO_USD_47]: 'pro',
  [STUDIO_STRIPE_PRICE_FOTO_USD_67]: 'foto',
  [STUDIO_STRIPE_PRICE_AGENCY_USD_97]: 'agency',
} as const;

export function getStudioPlanByPriceId(priceId: string): StudioPlan | undefined {
  const key = STUDIO_PRICE_TO_PLAN[priceId];
  return key ? STUDIO_PLANS[key] : undefined;
}
