import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  CRITICAL_DEPS,
  computeDmxYng,
  DEFAULT_YNG_WEIGHTS,
  dmxYngCalculator,
  getLabelKey,
  methodology,
  version,
  YNG_FETCH_DEPS,
} from '../yng';

const PERIOD = '2026-04-01';

function baseSubs(v: number): Record<string, number> {
  // F02 se invierte: pasamos commute 100-v para que F02_inv=v.
  return { F08: v, F02: 100 - v, N04: v, N08: v, N09: v, F03: v };
}

describe('DMX-YNG — Zona Millennial', () => {
  it('methodology + weights sum ≈ 1 + critical F08/F02/N04 + F02 inverted', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_YNG_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(CRITICAL_DEPS).toEqual(expect.arrayContaining(['F08', 'F02', 'N04']));
    const f02Dep = methodology.dependencies.find((d) => d.score_id === 'F02');
    expect(f02Dep?.inverted).toBe(true);
    expect(dmxYngCalculator.scoreId).toBe('DMX-YNG');
  });

  it('happy path: todos en 80 (F02=20 → F02_inv=80) → value 80', () => {
    const res = computeDmxYng({
      subscores: baseSubs(80),
      period: PERIOD,
      data_freshness_days: 5,
      sample_size: 6,
    });
    expect(res.value).toBe(80);
    expect(res.confidence).toBe('high');
    expect(res.components.F02_inv?.value).toBe(80);
    expect(res.components.F02_inv?.citation_source).toBe('zone_scores:F02');
  });

  it('F02 alto (commute largo) penaliza', () => {
    const subs = { F08: 80, F02: 90, N04: 80, N08: 80, N09: 80, F03: 80 };
    const res = computeDmxYng({ subscores: subs, period: PERIOD });
    // F02_inv = 10 → contribución 10·0.2 = 2 vs resto 80·0.8 = 64, → 66
    expect(res.value).toBeLessThan(80);
    expect(res.components.F02_inv?.value).toBe(10);
  });

  it('missing secundario F03 → re-normaliza', () => {
    const subs = baseSubs(70) as Record<string, number | null>;
    delete subs.F03;
    const res = computeDmxYng({ subscores: subs, period: PERIOD, sample_size: 5 });
    expect(res.value).toBe(70);
    expect(res.components._meta.redistributed_weights).toBe(true);
    expect(res.components._meta.missing_components).toContain('F03');
  });

  it('missing critical F02 → insufficient_data (F02_inv no derivable)', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.F02;
    const res = computeDmxYng({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components._meta.fallback_reason).toBe('critical_dep_missing');
    expect(res.components._meta.missing_components).toContain('F02_inv');
  });

  it('missing critical F08 → insufficient_data', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.F08;
    const res = computeDmxYng({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('missing critical N04 → insufficient_data', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.N04;
    const res = computeDmxYng({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('edge 0: F02=100 (commute saturado) + otros en 0 → value 0', () => {
    const subs = { F08: 0, F02: 100, N04: 0, N08: 0, N09: 0, F03: 0 };
    const res = computeDmxYng({ subscores: subs, period: PERIOD });
    expect(res.value).toBe(0);
    expect(res.components.bucket).toBe('bajo');
  });

  it('edge 100: F02=0 + otros en 100 → value 100', () => {
    const subs = { F08: 100, F02: 0, N04: 100, N08: 100, N09: 100, F03: 100 };
    const res = computeDmxYng({ subscores: subs, period: PERIOD });
    expect(res.value).toBe(100);
    expect(res.components.bucket).toBe('excelente');
  });

  it('circuit breaker: Δ > 20 → flag', () => {
    const res = computeDmxYng({
      subscores: baseSubs(75),
      period: PERIOD,
      previous_value: 40,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
    expect(res.trend_vs_previous).toBe(35);
  });

  it('trend computa delta', () => {
    const res = computeDmxYng({
      subscores: baseSubs(70),
      period: PERIOD,
      previous_value: 65,
    });
    expect(res.trend_vs_previous).toBe(5);
  });

  it('getLabelKey', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.yng.excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.index.yng.alto');
    expect(getLabelKey(45, 'low')).toBe('ie.index.yng.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.index.yng.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.yng.insufficient');
  });

  it('run() mock supabase con todas deps', async () => {
    const rows = YNG_FETCH_DEPS.map((d) => ({
      score_type: d,
      score_value: d === 'F02' ? 20 : 80,
      computed_at: new Date().toISOString(),
    }));
    const supabase = mockSupabase(rows);
    const out = await dmxYngCalculator.run(
      { zoneId: 'zone-test', countryCode: 'MX', periodDate: PERIOD },
      supabase,
    );
    expect(out.score_value).toBe(80);
    expect(out.confidence).toBe('high');
  });
});

function mockSupabase(rows: Array<Record<string, unknown>>): SupabaseClient {
  const from = vi.fn((t: string) => (t === 'zone_scores' ? buildQB(rows) : buildQB([])));
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
