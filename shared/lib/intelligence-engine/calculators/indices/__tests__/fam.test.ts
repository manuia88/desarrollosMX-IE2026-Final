import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  CRITICAL_DEPS,
  computeDmxFam,
  DEFAULT_FAM_WEIGHTS,
  dmxFamCalculator,
  FAM_FETCH_DEPS,
  getLabelKey,
  methodology,
  version,
} from '../fam';

const PERIOD = '2026-04-01';

function baseSubs(v: number): Record<string, number> {
  return { N02: v, F01: v, N08: v, N03: v, N10: v, N07: 100 - v };
}

describe('DMX-FAM — Zona Familiar', () => {
  it('methodology + weights sum ≈ 1 + critical N02 + F01 + N07 inverted', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_FAM_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(CRITICAL_DEPS).toEqual(expect.arrayContaining(['N02', 'F01']));
    const n07Dep = methodology.dependencies.find((d) => d.score_id === 'N07');
    expect(n07Dep?.inverted).toBe(true);
    expect(dmxFamCalculator.scoreId).toBe('DMX-FAM');
  });

  it('happy path: todos buenos (80) + ruido bajo (N07=20) → N07_inv=80, value=80', () => {
    const res = computeDmxFam({
      subscores: baseSubs(80),
      period: PERIOD,
      data_freshness_days: 5,
      sample_size: 6,
    });
    expect(res.value).toBe(80);
    expect(res.confidence).toBe('high');
    expect(res.components.N07_inv?.value).toBe(80); // 100-20
  });

  it('N07 alto (ruido fuerte) reduce score familiar', () => {
    const subs = { N02: 80, F01: 80, N08: 80, N03: 80, N10: 80, N07: 90 };
    const res = computeDmxFam({ subscores: subs, period: PERIOD });
    // N07_inv = 10, weighted contribution = 10*0.05 = 0.5; resto = 80*0.95 = 76
    expect(res.value).toBeLessThan(80);
    expect(res.components.N07_inv?.value).toBe(10);
  });

  it('missing secundario N03 → re-normaliza', () => {
    const subs = baseSubs(70) as Record<string, number | null>;
    delete subs.N03;
    const res = computeDmxFam({ subscores: subs, period: PERIOD, sample_size: 5 });
    // Todos los componentes se normalizan a 70 (incluyendo N07_inv=70 porque
    // baseSubs(70) setea N07=30). Missing N03 solo re-normaliza pesos.
    expect(res.value).toBe(70);
    expect(res.components._meta.redistributed_weights).toBe(true);
    expect(res.components._meta.missing_components).toContain('N03');
  });

  it('missing critical N02 → insufficient_data', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.N02;
    const res = computeDmxFam({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components._meta.fallback_reason).toBe('critical_dep_missing');
  });

  it('missing critical F01 → insufficient_data', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.F01;
    const res = computeDmxFam({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
  });

  it('edge 0: todos en 0 + N07 en 100 → value 0', () => {
    const subs = { N02: 0, F01: 0, N08: 0, N03: 0, N10: 0, N07: 100 };
    const res = computeDmxFam({ subscores: subs, period: PERIOD });
    expect(res.value).toBe(0);
    expect(res.confidence).not.toBe('insufficient_data');
  });

  it('edge 100: todos en 100 + N07 en 0 → value 100', () => {
    const subs = { N02: 100, F01: 100, N08: 100, N03: 100, N10: 100, N07: 0 };
    const res = computeDmxFam({ subscores: subs, period: PERIOD });
    expect(res.value).toBe(100);
    expect(res.components.bucket).toBe('excelente');
  });

  it('circuit breaker: Δ > 20 vs previous → flag', () => {
    const res = computeDmxFam({
      subscores: baseSubs(80),
      period: PERIOD,
      previous_value: 40,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
    expect(res.trend_vs_previous).toBe(40);
  });

  it('trend_vs_previous', () => {
    const res = computeDmxFam({
      subscores: baseSubs(70),
      period: PERIOD,
      previous_value: 65,
    });
    expect(res.trend_vs_previous).toBe(5);
  });

  it('getLabelKey', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.fam.excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.index.fam.alto');
    expect(getLabelKey(45, 'low')).toBe('ie.index.fam.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.index.fam.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.fam.insufficient');
  });

  it('run() integra mock supabase con deps completas', async () => {
    const rows = FAM_FETCH_DEPS.map((d) => ({
      score_type: d,
      score_value: d === 'N07' ? 20 : 80,
      computed_at: new Date().toISOString(),
    }));
    const supabase = mockSupabase(rows);
    const out = await dmxFamCalculator.run(
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
