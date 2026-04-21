import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  CRITICAL_DEPS,
  computeDmxMom,
  DEFAULT_MOM_WEIGHTS,
  dmxMomCalculator,
  getLabelKey,
  methodology,
  version,
} from '../mom';

const PERIOD = '2026-04-01';
const UNIVERSE_100 = Array.from({ length: 100 }, (_, i) => i);

describe('DMX-MOM — Momentum Index', () => {
  it('methodology + weights + critical deps', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/rank/);
    expect(methodology.sources).toContain('zone_scores:N11');
    expect(DEFAULT_MOM_WEIGHTS.N11).toBe(1.0);
    expect(CRITICAL_DEPS).toContain('N11');
    expect(dmxMomCalculator.scoreId).toBe('DMX-MOM');
    expect(dmxMomCalculator.tier).toBe(3);
  });

  it('happy path: N11=75 en universo 100 colonias → percentile ≈ 76, confidence high', () => {
    const res = computeDmxMom({
      n11_value: 75,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
      data_freshness_days: 5,
      sample_size: 100,
    });
    expect(res.value).toBe(76); // rank 76 / 100 × 100
    expect(res.confidence).toBe('high');
    expect(res.components.bucket).toBe('acelerando');
    expect(res.components.n11_base?.citation_source).toBe('zone_scores:N11');
    expect(res.components.n11_base?.citation_period).toBe(PERIOD);
    expect(res.components._meta.confidence_breakdown.overall).toBeGreaterThan(70);
  });

  it('missing critical N11 → insufficient_data', () => {
    const res = computeDmxMom({
      n11_value: null,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.n11_base).toBeNull();
  });

  it('edge 0: N11 lowest → value cerca de 1 (rank 1)', () => {
    const res = computeDmxMom({
      n11_value: 0,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
    });
    // rank=1 (único ≤ 0 es el 0), percentile = 1
    expect(res.value).toBeGreaterThanOrEqual(1);
    expect(res.value).toBeLessThanOrEqual(2);
    expect(res.components.bucket).toBe('rezagado');
  });

  it('edge 100: N11 highest → value 100', () => {
    const res = computeDmxMom({
      n11_value: 99,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
    });
    expect(res.value).toBe(100);
    expect(res.components.bucket).toBe('lider');
  });

  it('circuit breaker: Δ > 20% vs previous → flag triggered', () => {
    const res = computeDmxMom({
      n11_value: 80,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
      previous_value: 40, // delta 40 > 20
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
    expect(res.trend_vs_previous).toBe(41); // rank 81, value 81 vs 40
  });

  it('circuit breaker: Δ pequeño → no flag', () => {
    const res = computeDmxMom({
      n11_value: 50,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
      previous_value: 48,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(false);
  });

  it('trend: computa delta vs previous', () => {
    const res = computeDmxMom({
      n11_value: 60,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
      previous_value: 55,
    });
    expect(res.trend_vs_previous).not.toBeNull();
    expect(typeof res.trend_vs_previous).toBe('number');
  });

  it('universe chico (<20) → confidence low + fallback reason', () => {
    const res = computeDmxMom({
      n11_value: 50,
      universe_values: [40, 50, 60],
      universe_period: PERIOD,
    });
    expect(res.confidence).toBe('low');
    expect(res.components._meta.fallback_reason).toBe('universe_below_min');
  });

  it('shadow_mode flag propaga a _meta', () => {
    const res = computeDmxMom({
      n11_value: 75,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
      shadow_mode: true,
    });
    expect(res.components._meta.shadow).toBe(true);
  });

  it('nowcast flag + periods_covered propaga', () => {
    const res = computeDmxMom({
      n11_value: 75,
      universe_values: UNIVERSE_100,
      universe_period: PERIOD,
      nowcast: true,
      nowcast_periods_covered: 2,
    });
    expect(res.components._meta.nowcast_partial).toBe(true);
    expect(res.components._meta.periods_covered).toBe(2);
  });

  it('getLabelKey mapea buckets i18n', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.mom.lider');
    expect(getLabelKey(65, 'high')).toBe('ie.index.mom.acelerando');
    expect(getLabelKey(45, 'medium')).toBe('ie.index.mom.estable');
    expect(getLabelKey(20, 'low')).toBe('ie.index.mom.rezagado');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.mom.insufficient');
  });

  it('run() sin zoneId → insufficient', async () => {
    const supabase = mockSupabase([]);
    const out = await dmxMomCalculator.run(
      {
        countryCode: 'MX',
        periodDate: PERIOD,
      },
      supabase,
    );
    expect(out.confidence).toBe('insufficient_data');
  });

  it('run() happy path: supabase mock devuelve universe + self N11', async () => {
    const selfZoneId = 'zone-self';
    const rows = [
      { zone_id: selfZoneId, score_value: 75, computed_at: new Date().toISOString() },
      ...Array.from({ length: 99 }, (_, i) => ({
        zone_id: `zone-${i}`,
        score_value: i,
        computed_at: new Date().toISOString(),
      })),
    ];
    const supabase = mockSupabase(rows);
    const out = await dmxMomCalculator.run(
      {
        zoneId: selfZoneId,
        countryCode: 'MX',
        periodDate: PERIOD,
      },
      supabase,
    );
    expect(out.confidence).toBe('high');
    expect(out.score_value).toBeGreaterThan(0);
    expect(out.provenance.sources[0]?.name).toBe('zone_scores:N11');
    expect(out.valid_until).toBeTruthy();
  });
});

// --- helpers mock supabase ---
function mockSupabase(n11Rows: Array<Record<string, unknown>>): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'zone_scores') {
      return buildQueryThenable(n11Rows);
    }
    // score_history (fetchPreviousSnapshot) y dmx_indices_audit_log → vacío.
    return buildQueryThenable([]);
  });
  return { from } as unknown as SupabaseClient;
}

// Query builder "thenable" que acepta cualquier chain (.select.eq.in.lt.order.limit)
// y resuelve con el dataset. Compatible con await o .then().
function buildQueryThenable<T>(data: T[]): Record<string, unknown> {
  const result = { data, error: null };
  const qb: Record<string, unknown> = {};
  const self = () => qb;
  qb.select = self;
  qb.eq = self;
  qb.in = self;
  qb.lt = self;
  qb.gte = self;
  qb.lte = self;
  qb.neq = self;
  qb.gt = self;
  qb.order = self;
  qb.limit = self;
  qb.insert = () => Promise.resolve(result);
  qb.upsert = () => Promise.resolve(result);
  // biome-ignore lint/suspicious/noThenProperty: supabase-js query builder IS thenable by design; mock replica el contrato.
  qb.then = (
    onFulfilled: (v: { data: T[]; error: null }) => unknown,
    _onRejected?: (r: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled);
  qb.catch = (onRejected: (r: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
  return qb;
}
