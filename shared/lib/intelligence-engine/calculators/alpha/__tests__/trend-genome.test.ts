// Tests para trend-genome.ts — BLOQUE 11.H sub-agent B.
// Usa signalsOverride para inputs reproducibles sin network / mocks a sources.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { DenueAlphaSignals, InstagramHeatSignals } from '@/features/trend-genome/types';
import { ALPHA_SIGNAL_WEIGHTS } from '@/features/trend-genome/types';

vi.mock('@/shared/lib/intelligence-engine/sources/instagram-apify', () => ({
  fetchInstagramPublicGeotags: vi.fn(async () => ({
    chef_count: 0,
    gallery_count: 0,
    creator_count: 0,
    specialty_cafe_count: 0,
    raw_handles_hashed: [],
    source_confidence: 0,
    limitation: 'TEST_STUB',
  })),
  hashHandle: vi.fn((h: string) => h),
}));

vi.mock('@/shared/lib/intelligence-engine/sources/denue-alpha-classifier', () => ({
  classifyDenueAperturas: vi.fn(async () => ({
    specialty_cafe_count: 0,
    gallery_count: 0,
    boutique_count: 0,
    total_alpha_openings_6m: 0,
    sample_names: [],
    source_confidence: 0,
    limitation: 'TEST_STUB',
  })),
}));

// Importar después de los mocks.
import {
  calculateTrendGenome,
  classifyAlphaTier,
  computeTrendGenome,
  normalizeDenueAlpha,
  normalizeInstagramHeat,
  normalizeMigrationInflow,
  normalizePriceVelocityInv,
  type TrendGenomeSignals,
  timeToMainstreamMonths,
} from '../trend-genome';

const PERIOD = '2026-04-01';

function stubSupabase(): SupabaseClient {
  const emptyChain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      return this;
    },
    lte() {
      return this;
    },
    gte() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return Promise.resolve({ data: [], error: null });
    },
  };
  return {
    from() {
      return emptyChain;
    },
  } as unknown as SupabaseClient;
}

function makeIg(overrides: Partial<InstagramHeatSignals> = {}): InstagramHeatSignals {
  return {
    chef_count: 3,
    gallery_count: 2,
    creator_count: 4,
    specialty_cafe_count: 2,
    raw_handles_hashed: [],
    source_confidence: 0.8,
    limitation: null,
    ...overrides,
  };
}

function makeDenue(overrides: Partial<DenueAlphaSignals> = {}): DenueAlphaSignals {
  return {
    specialty_cafe_count: 4,
    gallery_count: 2,
    boutique_count: 1,
    total_alpha_openings_6m: 7,
    sample_names: [],
    source_confidence: 0.7,
    limitation: null,
    ...overrides,
  };
}

function makeSignals(overrides: Partial<TrendGenomeSignals> = {}): TrendGenomeSignals {
  return {
    instagram: makeIg(),
    denue: makeDenue(),
    migration: { decile: 8, volume: 1600, available: true },
    price: { change_pct: 5, available: true },
    pulse_score: 85,
    ...overrides,
  };
}

describe('Trend Genome — helpers', () => {
  it('ALPHA_SIGNAL_WEIGHTS suma 1.0', () => {
    const sum = Object.values(ALPHA_SIGNAL_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('normalizeInstagramHeat scales weighted raw into 0..100', () => {
    const low = normalizeInstagramHeat({
      chef_count: 1,
      gallery_count: 0,
      creator_count: 0,
      specialty_cafe_count: 0,
      raw_handles_hashed: [],
      source_confidence: 0.5,
      limitation: null,
    });
    expect(low).toBe(4); // 1 * 4
    const capped = normalizeInstagramHeat({
      chef_count: 100,
      gallery_count: 100,
      creator_count: 100,
      specialty_cafe_count: 100,
      raw_handles_hashed: [],
      source_confidence: 0.5,
      limitation: null,
    });
    expect(capped).toBe(100);
  });

  it('normalizeDenueAlpha cap at 100', () => {
    expect(normalizeDenueAlpha(makeDenue({ total_alpha_openings_6m: 5 }))).toBe(25);
    expect(normalizeDenueAlpha(makeDenue({ total_alpha_openings_6m: 100 }))).toBe(100);
  });

  it('normalizeMigrationInflow scales /20', () => {
    expect(normalizeMigrationInflow(0)).toBe(0);
    expect(normalizeMigrationInflow(500)).toBe(25);
    expect(normalizeMigrationInflow(2000)).toBe(100);
    expect(normalizeMigrationInflow(5000)).toBe(100);
  });

  it('normalizePriceVelocityInv inverts growth into 0..100 (null safe)', () => {
    expect(normalizePriceVelocityInv(null)).toBeNull();
    expect(normalizePriceVelocityInv(0)).toBe(100);
    expect(normalizePriceVelocityInv(10)).toBe(80);
    expect(normalizePriceVelocityInv(100)).toBe(0);
  });

  it('timeToMainstreamMonths buckets', () => {
    expect(timeToMainstreamMonths(85)).toBe(6);
    expect(timeToMainstreamMonths(70)).toBe(12);
    expect(timeToMainstreamMonths(55)).toBe(18);
    expect(timeToMainstreamMonths(45)).toBeNull();
  });

  it('classifyAlphaTier matrix', () => {
    expect(classifyAlphaTier(80, 8, 85)).toBe('golden_opportunity');
    expect(classifyAlphaTier(80, 8, 70)).toBe('confirmed');
    expect(classifyAlphaTier(80, 5, 85)).toBe('speculative');
    expect(classifyAlphaTier(80, null, null)).toBe('speculative');
    expect(classifyAlphaTier(60, 8, 90)).toBe('watchlist');
  });
});

describe('Trend Genome — computeTrendGenome (pure)', () => {
  it('T1: 5 signals present → score computed, confidence high, tier depends on inputs', () => {
    const res = computeTrendGenome({ signals: makeSignals() });
    expect(res.confidence).toBe('high');
    expect(res.alpha_score).toBeGreaterThan(0);
    expect(res.alpha_score).toBeLessThanOrEqual(100);
    expect(res.components.data_sources_available).toBeGreaterThanOrEqual(3);
    // migration decile 8, score ≥75, pulse 85 → golden_opportunity si alpha≥75.
    expect(['golden_opportunity', 'confirmed', 'speculative', 'watchlist']).toContain(
      res.components.tier,
    );
  });

  it('T2: Only IG + DENUE (no migration, no price) → confidence medium', () => {
    const signals = makeSignals({
      migration: { decile: null, volume: 0, available: false },
      price: { change_pct: null, available: false },
      pulse_score: null,
    });
    const res = computeTrendGenome({ signals });
    expect(res.confidence).toBe('medium');
    expect(res.components.migration_inflow.available).toBe(false);
    expect(res.components.price_velocity_inv.available).toBe(false);
  });

  it('T3: Only IG → confidence low', () => {
    const signals = makeSignals({
      denue: {
        specialty_cafe_count: 0,
        gallery_count: 0,
        boutique_count: 0,
        total_alpha_openings_6m: 0,
        sample_names: [],
        source_confidence: 0,
        limitation: 'TEST',
      },
      migration: { decile: null, volume: 0, available: false },
      price: { change_pct: null, available: false },
      pulse_score: null,
    });
    const res = computeTrendGenome({ signals });
    expect(res.confidence).toBe('low');
  });

  it('T4: No data → score 0, confidence insufficient_data', () => {
    const signals: TrendGenomeSignals = {
      instagram: {
        chef_count: 0,
        gallery_count: 0,
        creator_count: 0,
        specialty_cafe_count: 0,
        raw_handles_hashed: [],
        source_confidence: 0,
        limitation: 'NO_DATA',
      },
      denue: {
        specialty_cafe_count: 0,
        gallery_count: 0,
        boutique_count: 0,
        total_alpha_openings_6m: 0,
        sample_names: [],
        source_confidence: 0,
        limitation: 'NO_DATA',
      },
      migration: { decile: null, volume: 0, available: false },
      price: { change_pct: null, available: false },
      pulse_score: null,
    };
    const res = computeTrendGenome({ signals });
    expect(res.alpha_score).toBe(0);
    expect(res.confidence).toBe('insufficient_data');
    expect(res.time_to_mainstream_months).toBeNull();
    expect(res.components.tier).toBe('watchlist');
  });

  it('T5: Score ≥80 → time_to_mainstream_months = 6', () => {
    // Inflar IG + DENUE + migration a valores altos para alcanzar ≥80.
    const signals = makeSignals({
      instagram: makeIg({
        chef_count: 25,
        gallery_count: 15,
        creator_count: 10,
        specialty_cafe_count: 10,
      }),
      denue: makeDenue({
        total_alpha_openings_6m: 25,
      }),
      migration: { decile: 9, volume: 2500, available: true },
      price: { change_pct: 0, available: true },
    });
    const res = computeTrendGenome({ signals });
    expect(res.alpha_score).toBeGreaterThanOrEqual(80);
    expect(res.time_to_mainstream_months).toBe(6);
  });

  it('T6: Score 50-64 → time_to_mainstream_months = 18', () => {
    // Mid-tier signals: IG moderada, DENUE moderada, migration moderada.
    const signals = makeSignals({
      instagram: makeIg({
        chef_count: 4,
        gallery_count: 2,
        creator_count: 2,
        specialty_cafe_count: 3,
      }), // raw = 4 + 3 + 1 + 3.6 = 11.6 → 46.4
      denue: makeDenue({ total_alpha_openings_6m: 12 }), // 60
      migration: { decile: 7, volume: 1400, available: true }, // 70
      price: { change_pct: 20, available: true }, // 60
    });
    const res = computeTrendGenome({ signals });
    // weighted = 46.4*0.3 + 60*0.25 + 70*0.2 + 60*0.15 + 0*0.1
    //         = 13.92 + 15 + 14 + 9 = 51.92
    expect(res.alpha_score).toBeGreaterThanOrEqual(50);
    expect(res.alpha_score).toBeLessThan(65);
    expect(res.time_to_mainstream_months).toBe(18);
  });

  it('T7: Score <50 → time_to_mainstream_months null + tier watchlist', () => {
    const signals = makeSignals({
      instagram: makeIg({
        chef_count: 1,
        gallery_count: 0,
        creator_count: 1,
        specialty_cafe_count: 0,
      }),
      denue: makeDenue({ total_alpha_openings_6m: 2 }),
      migration: { decile: 3, volume: 50, available: true },
      price: { change_pct: 50, available: true },
      pulse_score: 40,
    });
    const res = computeTrendGenome({ signals });
    expect(res.alpha_score).toBeLessThan(50);
    expect(res.time_to_mainstream_months).toBeNull();
    expect(res.components.tier).toBe('watchlist');
  });

  it('T8: Golden opportunity: score ≥75 + migration decile ≥7 + pulse >80', () => {
    // Replicate T5 con pulse > 80.
    const signals = makeSignals({
      instagram: makeIg({
        chef_count: 25,
        gallery_count: 15,
        creator_count: 10,
        specialty_cafe_count: 10,
      }),
      denue: makeDenue({ total_alpha_openings_6m: 25 }),
      migration: { decile: 9, volume: 2500, available: true },
      price: { change_pct: 0, available: true },
      pulse_score: 90,
    });
    const res = computeTrendGenome({ signals });
    expect(res.alpha_score).toBeGreaterThanOrEqual(75);
    expect(res.components.tier).toBe('golden_opportunity');
  });

  it('T9: Breakdown contribution_pct sums ≈ 100% when available signals present', () => {
    const res = computeTrendGenome({ signals: makeSignals() });
    const total =
      res.components.instagram_heat.contribution_pct +
      res.components.denue_alpha.contribution_pct +
      res.components.migration_inflow.contribution_pct +
      res.components.price_velocity_inv.contribution_pct +
      res.components.search_volume.contribution_pct;
    expect(total).toBeGreaterThan(99.4);
    expect(total).toBeLessThan(100.6);
  });

  it('T10: calculateTrendGenome uses signalsOverride for reproducible inputs', async () => {
    const supabase = stubSupabase();
    const overrideSignals = makeSignals({
      instagram: makeIg({
        chef_count: 20,
        gallery_count: 10,
        creator_count: 5,
        specialty_cafe_count: 8,
      }),
      migration: { decile: 9, volume: 2200, available: true },
      pulse_score: 90,
    });
    const res = await calculateTrendGenome({
      zoneId: 'zone-test',
      scopeType: 'colonia',
      countryCode: 'MX',
      period: PERIOD,
      supabase,
      signalsOverride: overrideSignals,
    });
    expect(res.alpha_score).toBeGreaterThan(0);
    expect(res.components.migration_inflow.available).toBe(true);
    expect(res.components.pulse_score).toBe(90);
  });
});
