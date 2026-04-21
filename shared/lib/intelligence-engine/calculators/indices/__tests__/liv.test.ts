import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  CRITICAL_DEPS,
  computeDmxLiv,
  DEFAULT_LIV_WEIGHTS,
  dmxLivCalculator,
  getLabelKey,
  LIV_DEPS,
  methodology,
  version,
} from '../liv';

const PERIOD = '2026-04-01';

function allDepsValue(v: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of LIV_DEPS) out[d] = v;
  return out;
}

describe('DMX-LIV — Livability Index', () => {
  it('methodology + weights suma ≈ 1 + critical F08', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/F08/);
    const sum = Object.values(DEFAULT_LIV_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(CRITICAL_DEPS).toContain('F08');
    expect(dmxLivCalculator.scoreId).toBe('DMX-LIV');
  });

  it('happy path: todas deps en 80 → value 80, confidence high', () => {
    const res = computeDmxLiv({
      subscores: allDepsValue(80),
      period: PERIOD,
      data_freshness_days: 3,
      sample_size: 9,
    });
    expect(res.value).toBe(80);
    expect(res.confidence).toBe('high');
    expect(res.components.bucket).toBe('excelente');
    expect(res.components.F08?.citation_source).toBe('zone_scores:F08');
    expect(res.components.coverage_pct).toBe(100);
  });

  it('missing 1 componente secundario (N04) → re-normaliza + confidence medium', () => {
    const subs = allDepsValue(70);
    delete (subs as Record<string, number | null>).N04;
    const res = computeDmxLiv({
      subscores: subs,
      period: PERIOD,
      data_freshness_days: 5,
      sample_size: 8,
    });
    expect(res.value).toBe(70);
    expect(['medium', 'high']).toContain(res.confidence);
    expect(res.components._meta.redistributed_weights).toBe(true);
    expect(res.components._meta.missing_components).toContain('N04');
  });

  it('missing critical F08 → insufficient_data', () => {
    const subs = allDepsValue(70);
    delete (subs as Record<string, number | null>).F08;
    const res = computeDmxLiv({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components._meta.fallback_reason).toBe('critical_F08_missing');
  });

  it('edge 0: todas deps en 0 → value 0', () => {
    const res = computeDmxLiv({ subscores: allDepsValue(0), period: PERIOD });
    expect(res.value).toBe(0);
    expect(res.components.bucket).toBe('bajo');
    expect(res.confidence).not.toBe('insufficient_data');
  });

  it('edge 100: todas deps en 100 → value 100', () => {
    const res = computeDmxLiv({ subscores: allDepsValue(100), period: PERIOD });
    expect(res.value).toBe(100);
    expect(res.components.bucket).toBe('excelente');
  });

  it('circuit breaker: Δ > 20 vs previous → flag triggered', () => {
    const res = computeDmxLiv({
      subscores: allDepsValue(80),
      period: PERIOD,
      previous_value: 50,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
    expect(res.trend_vs_previous).toBe(30);
  });

  it('trend_vs_previous computa correctamente', () => {
    const res = computeDmxLiv({
      subscores: allDepsValue(70),
      period: PERIOD,
      previous_value: 65,
    });
    expect(res.trend_vs_previous).toBe(5);
  });

  it('getLabelKey', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.liv.excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.index.liv.alto');
    expect(getLabelKey(45, 'low')).toBe('ie.index.liv.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.index.liv.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.liv.insufficient');
  });

  it('run() integra supabase mock con deps completas', async () => {
    const rows = LIV_DEPS.map((d) => ({
      score_type: d,
      score_value: 75,
      computed_at: new Date().toISOString(),
    }));
    const supabase = mockSupabase(rows);
    const out = await dmxLivCalculator.run(
      { zoneId: 'zone-test', countryCode: 'MX', periodDate: PERIOD },
      supabase,
    );
    expect(out.score_value).toBe(75);
    expect(out.confidence).toBe('high');
    expect(out.citations.length).toBe(LIV_DEPS.length);
  });
});

function mockSupabase(rows: Array<Record<string, unknown>>): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'zone_scores') return buildQB(rows);
    return buildQB([]);
  });
  return { from } as unknown as SupabaseClient;
}

function buildQB<T>(data: T[]): Record<string, unknown> {
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
  qb.then = (onFulfilled: (v: { data: T[]; error: null }) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  qb.catch = (onRejected: (r: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
  return qb;
}
