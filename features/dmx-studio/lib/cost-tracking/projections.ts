// F14.F.11 Sprint 10 BIBLIA Tarea 10.2 — Cost projection library (real H1).
// Calcula costo proyectado mensual por plan + usage profile usando precios canon
// hardcoded de proveedores APIs externas. Pure function — sin side effects, sin DB,
// sin network. Source of truth para Unit Economics + Break-even calc.
//
// Pricing canon (BIBLIA v4 + memoria 7 verify-before-spend):
//   - Replicate Kling: $2.25 / video render
//   - ElevenLabs TTS Flash: $0.025 / narración
//   - Anthropic Claude Director: $0.10 / proyecto
//   - Anthropic Vision classify: $0.003 / foto
//   - Deepgram Nova-3: $0.04 / transcripción 5min
//   - HeyGen avatar: $0.20 / clip
//   - fal.ai Seedance: $0.80 / clip
//   - Pedra virtual staging: $0.25 / foto
//   - Vercel Sandbox FFmpeg: ~$0.10 / render
//
// Plans canon (stripe-products.ts ADR-054 + FASE 14.F.12 MXN escala masiva):
//   - founder: MXN 997/mes (~$58.65 USD), 5 videos/mes (2 premium + 3 basic)
//   - pro: MXN 2,497/mes (~$146.88 USD), 15 videos/mes (5 premium + 10 basic)
//   - agency: MXN 5,997/mes (~$352.76 USD), 50 videos/mes (20 premium + 30 basic)
//
// Usage profiles modelan distribución comportamiento típico:
//   - light: 5 videos/mes (asesor casual)
//   - typical: 20 videos/mes (asesor activo)
//   - heavy: 50 videos/mes (agencia / fotógrafo)
//
// NOTA: cost projections operan en USD (proveedores APIs facturados USD).
// planPriceUsd usa priceUsdEquivalent calculado MXN→USD para comparabilidad.

import type { StudioPlanKey } from '@/features/dmx-studio/lib/stripe-products';
import { STUDIO_PLANS } from '@/features/dmx-studio/lib/stripe-products';

export type UsageProfile = 'light' | 'typical' | 'heavy';

export interface ProviderPrice {
  readonly provider: string;
  readonly unit: string;
  readonly costUsd: number;
}

export type ProviderKey =
  | 'replicate_kling'
  | 'elevenlabs_tts_flash'
  | 'anthropic_director'
  | 'anthropic_vision'
  | 'deepgram_nova3'
  | 'heygen_avatar'
  | 'fal_seedance'
  | 'pedra_virtual_staging'
  | 'vercel_sandbox_ffmpeg';

export const PROVIDER_PRICES_CANON: { readonly [K in ProviderKey]: ProviderPrice } = {
  replicate_kling: {
    provider: 'Replicate Kling',
    unit: 'video_render',
    costUsd: 2.25,
  },
  elevenlabs_tts_flash: {
    provider: 'ElevenLabs TTS Flash',
    unit: 'narration',
    costUsd: 0.025,
  },
  anthropic_director: {
    provider: 'Anthropic Claude Director',
    unit: 'project',
    costUsd: 0.1,
  },
  anthropic_vision: {
    provider: 'Anthropic Vision classify',
    unit: 'photo',
    costUsd: 0.003,
  },
  deepgram_nova3: {
    provider: 'Deepgram Nova-3',
    unit: 'transcription_5min',
    costUsd: 0.04,
  },
  heygen_avatar: {
    provider: 'HeyGen avatar',
    unit: 'clip',
    costUsd: 0.2,
  },
  fal_seedance: {
    provider: 'fal.ai Seedance',
    unit: 'clip',
    costUsd: 0.8,
  },
  pedra_virtual_staging: {
    provider: 'Pedra virtual staging',
    unit: 'photo',
    costUsd: 0.25,
  },
  vercel_sandbox_ffmpeg: {
    provider: 'Vercel Sandbox FFmpeg',
    unit: 'render',
    costUsd: 0.1,
  },
} as const;

export const USAGE_PROFILE_VIDEOS: Readonly<Record<UsageProfile, number>> = {
  light: 5,
  typical: 20,
  heavy: 50,
} as const;

// Costo variable por video estándar (1 render Kling + 1 narración + 1 director +
// FFmpeg compose). Photos extra opcionales se modelan según plan.
export const PER_VIDEO_BASE_COST_USD =
  PROVIDER_PRICES_CANON.replicate_kling.costUsd +
  PROVIDER_PRICES_CANON.elevenlabs_tts_flash.costUsd +
  PROVIDER_PRICES_CANON.anthropic_director.costUsd +
  PROVIDER_PRICES_CANON.vercel_sandbox_ffmpeg.costUsd;

// Modelo plan-aware: agency incluye virtual staging + voice clone amortized,
// pro incluye copy pack full + series mode (extra TTS), founder es base.
function planExtraCostPerVideo(planKey: StudioPlanKey): number {
  switch (planKey) {
    case 'founder':
      return 0;
    case 'pro':
      // Pro: copy pack full + series mode → extra TTS amortized
      return PROVIDER_PRICES_CANON.elevenlabs_tts_flash.costUsd;
    case 'agency':
      // Agency: virtual staging (1 photo) + voice clone amortized
      return (
        PROVIDER_PRICES_CANON.pedra_virtual_staging.costUsd +
        PROVIDER_PRICES_CANON.elevenlabs_tts_flash.costUsd
      );
  }
}

// Fixed monthly costs (infra base no escalable por video):
//   - Vercel Pro: ~$20/mes (compartido, atribuido $5 a Studio MVP H1)
//   - Supabase Pro: ~$25/mes (compartido, atribuido $10)
//   - Sentry telemetry: $0 (free tier H1)
//   - Domain + DNS: $0 (compartido DMX)
const FIXED_INFRA_COST_USD_PER_MONTH = 15;

export interface CostProjection {
  readonly planKey: StudioPlanKey;
  readonly usageProfile: UsageProfile;
  readonly videosPerMonth: number;
  readonly fixedCosts: number;
  readonly variableCosts: number;
  readonly totalCosts: number;
  readonly perVideoCost: number;
  readonly planPriceUsd: number;
  readonly grossMarginUsd: number;
  readonly grossMarginPct: number;
}

/**
 * Project monthly Studio API costs given a plan + usage profile.
 *
 * Returns hardcoded canon prices × usage. NO DB query — pure deterministic
 * calculator suitable for SSR + tests.
 *
 * grossMarginPct = (planPriceUsd - totalCosts) / planPriceUsd × 100.
 * Negative margins signal unprofitable usage (heavy on pro plan, etc).
 */
export function projectMonthlyCosts(
  planKey: StudioPlanKey,
  usageProfile: UsageProfile,
): CostProjection {
  const plan = STUDIO_PLANS[planKey];
  const videos = USAGE_PROFILE_VIDEOS[usageProfile];
  const perVideoCost = PER_VIDEO_BASE_COST_USD + planExtraCostPerVideo(planKey);
  const variableCosts = perVideoCost * videos;
  const fixedCosts = FIXED_INFRA_COST_USD_PER_MONTH;
  const totalCosts = fixedCosts + variableCosts;
  const planPriceUsd = plan.priceUsdEquivalent ?? 0;
  const grossMarginUsd = planPriceUsd - totalCosts;
  const grossMarginPct = planPriceUsd > 0 ? (grossMarginUsd / planPriceUsd) * 100 : 0;

  return {
    planKey,
    usageProfile,
    videosPerMonth: videos,
    fixedCosts: round2(fixedCosts),
    variableCosts: round2(variableCosts),
    totalCosts: round2(totalCosts),
    perVideoCost: round2(perVideoCost),
    planPriceUsd,
    grossMarginUsd: round2(grossMarginUsd),
    grossMarginPct: round2(grossMarginPct),
  };
}

export interface AllProjections {
  readonly projections: ReadonlyArray<CostProjection>;
  readonly providerPrices: typeof PROVIDER_PRICES_CANON;
  readonly fixedInfraCostUsd: number;
}

/**
 * Compute all 3 plans × 3 usage profiles = 9 projections.
 * Used by admin dashboard + UNIT_ECONOMICS.md doc generation.
 */
export function projectAllCombinations(): AllProjections {
  const planKeys: ReadonlyArray<StudioPlanKey> = ['founder', 'pro', 'agency'];
  const profiles: ReadonlyArray<UsageProfile> = ['light', 'typical', 'heavy'];
  const projections: CostProjection[] = [];
  for (const plan of planKeys) {
    for (const profile of profiles) {
      projections.push(projectMonthlyCosts(plan, profile));
    }
  }
  return {
    projections,
    providerPrices: PROVIDER_PRICES_CANON,
    fixedInfraCostUsd: FIXED_INFRA_COST_USD_PER_MONTH,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
