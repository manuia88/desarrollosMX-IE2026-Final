// F14.F.11 Sprint 10 BIBLIA Tarea 10.2 — Cost projection + break-even tests.
// Pure function tests (Modo A — no DB, no network). Cover 3 plans × 3 profiles
// = 9 combinations + edge cases (negative margin, break-even threshold).
// FASE 14.F.12 — Plan keys actualizados founder/pro/agency + planPriceUsd vía
// priceUsdEquivalent (MXN→USD canon).

import { describe, expect, it } from 'vitest';
import {
  calculateBreakEven,
  calculateBreakEvenAllPlans,
} from '@/features/dmx-studio/lib/cost-tracking/break-even';
import {
  PER_VIDEO_BASE_COST_USD,
  PROVIDER_PRICES_CANON,
  projectAllCombinations,
  projectMonthlyCosts,
  USAGE_PROFILE_VIDEOS,
} from '@/features/dmx-studio/lib/cost-tracking/projections';
import { STUDIO_PLANS } from '@/features/dmx-studio/lib/stripe-products';

describe('projectMonthlyCosts — canon constants', () => {
  it('PROVIDER_PRICES_CANON contains all 9 expected providers', () => {
    const keys = Object.keys(PROVIDER_PRICES_CANON).sort();
    expect(keys).toEqual(
      [
        'replicate_kling',
        'elevenlabs_tts_flash',
        'anthropic_director',
        'anthropic_vision',
        'deepgram_nova3',
        'heygen_avatar',
        'fal_seedance',
        'pedra_virtual_staging',
        'vercel_sandbox_ffmpeg',
      ].sort(),
    );
  });

  it('Replicate Kling priced $2.25/video (canon BIBLIA)', () => {
    expect(PROVIDER_PRICES_CANON.replicate_kling.costUsd).toBe(2.25);
  });

  it('ElevenLabs TTS Flash priced $0.025/narration', () => {
    expect(PROVIDER_PRICES_CANON.elevenlabs_tts_flash.costUsd).toBe(0.025);
  });

  it('PER_VIDEO_BASE_COST_USD = $2.475 (Kling+TTS+Director+FFmpeg)', () => {
    // 2.25 + 0.025 + 0.10 + 0.10 = 2.475
    expect(PER_VIDEO_BASE_COST_USD).toBeCloseTo(2.475, 5);
  });

  it('USAGE_PROFILE_VIDEOS canon thresholds', () => {
    expect(USAGE_PROFILE_VIDEOS.light).toBe(5);
    expect(USAGE_PROFILE_VIDEOS.typical).toBe(20);
    expect(USAGE_PROFILE_VIDEOS.heavy).toBe(50);
  });
});

describe('projectMonthlyCosts — founder plan ($997 MXN/mes ≈ $58.65 USD)', () => {
  it('light usage (5 videos) is profitable', () => {
    const p = projectMonthlyCosts('founder', 'light');
    expect(p.planKey).toBe('founder');
    expect(p.usageProfile).toBe('light');
    expect(p.videosPerMonth).toBe(5);
    expect(p.perVideoCost).toBeCloseTo(2.475, 2);
    // 5 × 2.475 = 12.375
    expect(p.variableCosts).toBeCloseTo(12.38, 1);
    expect(p.fixedCosts).toBe(15);
    // 12.375 + 15 = 27.375
    expect(p.totalCosts).toBeCloseTo(27.38, 1);
    expect(p.planPriceUsd).toBe(STUDIO_PLANS.founder.priceUsdEquivalent);
    expect(p.grossMarginUsd).toBeGreaterThan(0);
    expect(p.grossMarginPct).toBeGreaterThan(40);
  });

  it('heavy usage (50 videos) becomes unprofitable', () => {
    const p = projectMonthlyCosts('founder', 'heavy');
    // 50 × 2.475 = 123.75 + 15 = 138.75 > $58.65
    expect(p.totalCosts).toBeGreaterThan(p.planPriceUsd);
    expect(p.grossMarginUsd).toBeLessThan(0);
    expect(p.grossMarginPct).toBeLessThan(0);
  });
});

describe('projectMonthlyCosts — pro plan ($2497 MXN/mes ≈ $146.88 USD, copy pack full)', () => {
  it('typical usage models extra TTS amortized', () => {
    const p = projectMonthlyCosts('pro', 'typical');
    expect(p.planKey).toBe('pro');
    expect(p.usageProfile).toBe('typical');
    // perVideoCost = base 2.475 + extra TTS 0.025 = 2.50
    expect(p.perVideoCost).toBeCloseTo(2.5, 2);
    expect(p.planPriceUsd).toBe(STUDIO_PLANS.pro.priceUsdEquivalent);
  });

  it('typical and heavy usage profitable on pro plan', () => {
    const typical = projectMonthlyCosts('pro', 'typical');
    const heavy = projectMonthlyCosts('pro', 'heavy');
    // typical: 20 × 2.5 + 15 = 65 < 146.88 ⇒ profitable
    expect(typical.grossMarginUsd).toBeGreaterThan(0);
    // heavy: 50 × 2.5 + 15 = 140 < 146.88 ⇒ still profitable (tight)
    expect(heavy.grossMarginUsd).toBeGreaterThan(0);
  });
});

describe('projectMonthlyCosts — agency plan ($5997 MXN/mes ≈ $352.76 USD, virtual staging incluido)', () => {
  it('per video cost includes virtual staging + extra TTS', () => {
    const p = projectMonthlyCosts('agency', 'typical');
    // base 2.475 + virtual_staging 0.25 + tts 0.025 = 2.75
    expect(p.perVideoCost).toBeCloseTo(2.75, 2);
    expect(p.planPriceUsd).toBe(STUDIO_PLANS.agency.priceUsdEquivalent);
  });

  it('typical (20 videos) and heavy (50 videos) profitable on agency', () => {
    const typical = projectMonthlyCosts('agency', 'typical');
    const heavy = projectMonthlyCosts('agency', 'heavy');
    // typical: 20 × 2.75 + 15 = 70 < 352.76 ⇒ profitable
    expect(typical.grossMarginUsd).toBeGreaterThan(0);
    // heavy: 50 × 2.75 + 15 = 152.5 < 352.76 ⇒ profitable
    expect(heavy.grossMarginUsd).toBeGreaterThan(0);
  });
});

describe('projectAllCombinations', () => {
  it('returns 9 projections (3 plans × 3 profiles)', () => {
    const all = projectAllCombinations();
    expect(all.projections.length).toBe(9);
    const planSet = new Set(all.projections.map((p) => p.planKey));
    const profileSet = new Set(all.projections.map((p) => p.usageProfile));
    expect(planSet.size).toBe(3);
    expect(profileSet.size).toBe(3);
  });

  it('exposes provider prices + fixed infra cost', () => {
    const all = projectAllCombinations();
    expect(all.providerPrices).toBe(PROVIDER_PRICES_CANON);
    expect(all.fixedInfraCostUsd).toBe(15);
  });
});

describe('calculateBreakEven', () => {
  it('founder plan typical usage profitable break-even achievable', () => {
    const be = calculateBreakEven('founder', 'typical');
    // founder typical = 20 × 2.475 = 49.5; margin = 58.65 - 49.5 = 9.15
    expect(be.profitableAtUsage).toBe(true);
    expect(be.contributionMarginPerUserUsd).toBeGreaterThan(0);
  });

  it('founder plan light usage profitable break-even achievable', () => {
    const be = calculateBreakEven('founder', 'light');
    // founder light = 5 × 2.475 = 12.375; margin per user = 58.65 - 12.375 ≈ 46.27
    // users needed = ceil(100 / 46.27) ≈ 3
    expect(be.profitableAtUsage).toBe(true);
    expect(be.usersNeeded).toBeLessThan(10);
    expect(be.contributionMarginPerUserUsd).toBeGreaterThan(40);
  });

  it('pro plan typical usage profitable', () => {
    const be = calculateBreakEven('pro', 'typical');
    // pro typical = 20 × 2.5 = 50; margin = 146.88 - 50 = 96.88
    expect(be.profitableAtUsage).toBe(true);
    expect(be.usersNeeded).toBeLessThan(5);
    expect(be.contributionMarginPerUserUsd).toBeGreaterThan(90);
  });

  it('agency plan typical usage profitable', () => {
    const be = calculateBreakEven('agency', 'typical');
    // agency typical = 20 × 2.75 = 55; margin = 352.76 - 55 ≈ 297.76
    expect(be.profitableAtUsage).toBe(true);
    expect(be.contributionMarginPerUserUsd).toBeGreaterThan(290);
    expect(be.usersNeeded).toBeLessThanOrEqual(2);
  });

  it('mrrTargetUsd = usersNeeded × planPriceUsdEquivalent', () => {
    const be = calculateBreakEven('agency', 'typical');
    const expected = be.usersNeeded * (STUDIO_PLANS.agency.priceUsdEquivalent ?? 0);
    expect(be.mrrTargetUsd).toBeCloseTo(expected, 1);
  });

  it('contributionMarginPct between 0-100 when profitable', () => {
    const be = calculateBreakEven('agency', 'light');
    expect(be.contributionMarginPct).toBeGreaterThan(0);
    expect(be.contributionMarginPct).toBeLessThanOrEqual(100);
  });
});

describe('calculateBreakEvenAllPlans', () => {
  it('returns 3 plan analyses + canon constants', () => {
    const summary = calculateBreakEvenAllPlans();
    expect(summary.perPlan.length).toBe(3);
    const planKeys = summary.perPlan.map((p) => p.planKey).sort();
    expect(planKeys).toEqual(['agency', 'founder', 'pro']);
    expect(summary.operationalFixedUsd).toBe(100);
    expect(summary.perVideoBaseCostUsd).toBeCloseTo(2.475, 3);
  });

  it('all plans use typical profile by default', () => {
    const summary = calculateBreakEvenAllPlans();
    for (const plan of summary.perPlan) {
      expect(plan.assumedUsageProfile).toBe('typical');
    }
  });
});
