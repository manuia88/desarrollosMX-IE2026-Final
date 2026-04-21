// Tests para alerts-engine.ts — BLOQUE 11.H.4 sub-agent B.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { AlphaComputeResult } from '@/features/trend-genome/types';

vi.mock('@/shared/lib/intelligence-engine/sources/instagram-apify', () => ({
  fetchInstagramPublicGeotags: vi.fn(),
  hashHandle: vi.fn(),
}));
vi.mock('@/shared/lib/intelligence-engine/sources/denue-alpha-classifier', () => ({
  classifyDenueAperturas: vi.fn(),
}));

import { computeScoreDriftPct, detectNewAlphaZones, isDriftNeedingReview } from '../alerts-engine';

const PERIOD = '2026-04-01';

interface CapturedInsert {
  readonly row: Record<string, unknown>;
}

interface MockSupabaseOptions {
  readonly previousScore?: number | null;
  readonly subscribersCount?: number;
}

function mockSupabase(
  captured: CapturedInsert[],
  options: MockSupabaseOptions = {},
): SupabaseClient {
  const previousScore = options.previousScore ?? null;
  const subscribersCount = options.subscribersCount ?? 0;

  const alertsReadChain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      if (previousScore === null) {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({
        data: [{ alpha_score: previousScore }],
        error: null,
      });
    },
  };

  const alertsInsertMethod = {
    insert(row: Record<string, unknown>) {
      captured.push({ row });
      return Promise.resolve({ data: null, error: null });
    },
    select() {
      return alertsReadChain;
    },
  };

  const subscriptionsChain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    in() {
      // Resolves to count response shape — HEAD true returns { count, data:null }.
      return Promise.resolve({ data: null, error: null, count: subscribersCount });
    },
  };

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
    gte() {
      return this;
    },
    lte() {
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
    from(table: string) {
      if (table === 'zone_alpha_alerts') {
        // Merge insert + read chain — Supabase from() usually returns a
        // thenable builder that supports both paths.
        return alertsInsertMethod;
      }
      if (table === 'zone_alert_subscriptions') return subscriptionsChain;
      return emptyChain;
    },
  } as unknown as SupabaseClient;
}

function makeComputeResult(score: number): AlphaComputeResult {
  return {
    alpha_score: score,
    time_to_mainstream_months: score >= 80 ? 6 : score >= 65 ? 12 : score >= 50 ? 18 : null,
    confidence: 'high',
    components: {
      instagram_heat: {
        key: 'instagram_heat',
        raw_value: 10,
        normalized_0_100: 40,
        weight: 0.3,
        contribution_pct: 25,
        available: true,
        source: 'apify_instagram',
      },
      denue_alpha: {
        key: 'denue_alpha',
        raw_value: 10,
        normalized_0_100: 50,
        weight: 0.25,
        contribution_pct: 25,
        available: true,
        source: 'denue_alpha_classifier',
      },
      migration_inflow: {
        key: 'migration_inflow',
        raw_value: 1600,
        normalized_0_100: 80,
        weight: 0.2,
        contribution_pct: 25,
        available: true,
        source: 'zone_migration_flows',
      },
      price_velocity_inv: {
        key: 'price_velocity_inv',
        raw_value: 5,
        normalized_0_100: 90,
        weight: 0.15,
        contribution_pct: 25,
        available: true,
        source: 'zona_snapshots',
      },
      search_volume: {
        key: 'search_volume',
        raw_value: null,
        normalized_0_100: null,
        weight: 0.1,
        contribution_pct: 0,
        available: false,
        source: 'google_trends_stub',
      },
      data_sources_available: 4,
      coverage_pct: 80,
      tier: score >= 75 ? 'confirmed' : 'watchlist',
      migration_inflow_decile: 8,
      pulse_score: 85,
    },
    signals_jsonb: {
      ig: { chef: 3, gal: 2, cre: 4, cafe: 2 },
      denue: { cafe: 4, gal: 2, bou: 1, total: 7 },
      mig: { decile: 8, vol: 1600 },
      price: { delta_pct: 5 },
      tier: score >= 75 ? 'confirmed' : 'watchlist',
      ttm_months: score >= 80 ? 6 : null,
      confidence: 'high',
    },
  };
}

describe('alerts-engine — drift helpers', () => {
  it('computeScoreDriftPct handles null previous', () => {
    expect(computeScoreDriftPct(80, null)).toBeNull();
    expect(computeScoreDriftPct(80, 0)).toBeNull();
    expect(computeScoreDriftPct(80, 60)).toBeCloseTo(33.33, 1);
    expect(computeScoreDriftPct(70, 80)).toBeCloseTo(-12.5, 1);
  });

  it('isDriftNeedingReview threshold 25%', () => {
    expect(isDriftNeedingReview(null)).toBe(false);
    expect(isDriftNeedingReview(10)).toBe(false);
    expect(isDriftNeedingReview(25)).toBe(false);
    expect(isDriftNeedingReview(25.1)).toBe(true);
    expect(isDriftNeedingReview(-30)).toBe(true);
  });
});

describe('detectNewAlphaZones', () => {
  it('T1: New zone crossing threshold (prev null, current 80) → is_new_alpha true, needs_review false, alert inserted', async () => {
    const captured: CapturedInsert[] = [];
    const supabase = mockSupabase(captured, { previousScore: null, subscribersCount: 3 });
    const calculateFn = vi.fn(async () => makeComputeResult(80));

    const res = await detectNewAlphaZones({
      periodDate: PERIOD,
      supabase,
      calculateFn,
      zoneIds: ['zone-A'],
    });

    expect(res.detections).toHaveLength(1);
    const d = res.detections[0];
    expect(d).toBeDefined();
    expect(d?.is_new_alpha).toBe(true);
    expect(d?.needs_review).toBe(false);
    expect(d?.previous_score).toBeNull();
    expect(d?.score_drift_pct).toBeNull();
    expect(res.alerts_triggered).toBe(1);
    expect(captured).toHaveLength(1);
    const row = captured[0]?.row;
    expect(row).toBeDefined();
    expect(row?.alpha_score).toBe(80);
    expect(row?.subscribers_notified).toBe(3);
    expect(row?.is_active).toBe(true);
  });

  it('T2: Existing alpha with drift +5% → is_new_alpha false, needs_review false', async () => {
    const captured: CapturedInsert[] = [];
    const supabase = mockSupabase(captured, { previousScore: 76, subscribersCount: 2 });
    const calculateFn = vi.fn(async () => makeComputeResult(80));

    const res = await detectNewAlphaZones({
      periodDate: PERIOD,
      supabase,
      calculateFn,
      zoneIds: ['zone-A'],
    });

    const d = res.detections[0];
    expect(d?.is_new_alpha).toBe(false); // previous already ≥70
    expect(d?.needs_review).toBe(false);
    expect(d?.score_drift_pct).toBeCloseTo(5.26, 1);
    expect(res.alerts_triggered).toBe(1);
    const row = captured[0]?.row;
    expect(row?.subscribers_notified).toBe(2);
  });

  it('T3: Existing alpha with drift +30% → needs_review true, subscribers_notified = 0', async () => {
    const captured: CapturedInsert[] = [];
    const supabase = mockSupabase(captured, { previousScore: 60, subscribersCount: 5 });
    const calculateFn = vi.fn(async () => makeComputeResult(80));

    const res = await detectNewAlphaZones({
      periodDate: PERIOD,
      supabase,
      calculateFn,
      zoneIds: ['zone-A'],
    });

    const d = res.detections[0];
    expect(d?.needs_review).toBe(true);
    expect(d?.is_new_alpha).toBe(true); // previous <70, current ≥70
    expect(res.alerts_triggered).toBe(1);
    const row = captured[0]?.row;
    expect(row?.subscribers_notified).toBe(0); // gate humano bloquea notificaciones
    const signals = row?.signals as Record<string, unknown>;
    expect(signals.needs_review).toBe(true);
  });

  it('T4: Score <70 → no insert, no notify', async () => {
    const captured: CapturedInsert[] = [];
    const supabase = mockSupabase(captured, { previousScore: null, subscribersCount: 10 });
    const calculateFn = vi.fn(async () => makeComputeResult(50));

    const res = await detectNewAlphaZones({
      periodDate: PERIOD,
      supabase,
      calculateFn,
      zoneIds: ['zone-A'],
    });

    expect(res.detections).toHaveLength(1);
    expect(res.alerts_triggered).toBe(0);
    expect(captured).toHaveLength(0);
    expect(res.detections[0]?.is_new_alpha).toBe(false);
  });

  it('T5: needs_review true → subscribers_notified stays 0 even with subs available', async () => {
    const captured: CapturedInsert[] = [];
    const supabase = mockSupabase(captured, { previousScore: 50, subscribersCount: 8 });
    const calculateFn = vi.fn(async () => makeComputeResult(75));

    const res = await detectNewAlphaZones({
      periodDate: PERIOD,
      supabase,
      calculateFn,
      zoneIds: ['zone-A'],
    });

    const d = res.detections[0];
    expect(d?.needs_review).toBe(true); // drift = 50%
    expect(res.alerts_triggered).toBe(1);
    const row = captured[0]?.row;
    expect(row?.subscribers_notified).toBe(0);
  });

  it('T6: empty zoneIds → empty detections', async () => {
    const captured: CapturedInsert[] = [];
    const supabase = mockSupabase(captured);
    const calculateFn = vi.fn(async () => makeComputeResult(80));

    const res = await detectNewAlphaZones({
      periodDate: PERIOD,
      supabase,
      calculateFn,
      zoneIds: [],
    });

    expect(res.detections).toHaveLength(0);
    expect(res.alerts_triggered).toBe(0);
    expect(calculateFn).not.toHaveBeenCalled();
  });
});
