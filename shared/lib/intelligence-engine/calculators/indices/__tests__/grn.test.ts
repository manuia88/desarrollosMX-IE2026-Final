import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  CRITICAL_DEPS,
  computeDmxGrn,
  DEFAULT_GRN_WEIGHTS,
  dmxGrnCalculator,
  GRN_FETCH_DEPS,
  getLabelKey,
  methodology,
  version,
} from '../grn';

const PERIOD = '2026-04-01';

function baseSubs(v: number): Record<string, number> {
  return { N10: v, N05: v, N08: v, F06: v, F04: v };
}

describe('DMX-GRN — Zona Verde / Sustentable', () => {
  it('methodology + weights sum ≈ 1 + critical N10/N08 + limitations documentadas', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(DEFAULT_GRN_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(CRITICAL_DEPS).toEqual(expect.arrayContaining(['N10', 'N08']));
    const h01Green = methodology.dependencies.find((d) => d.score_id === 'H01_green');
    expect(h01Green?.proxy).toBe('N08');
    expect(h01Green?.limitation).toBeTruthy();
    const f04 = methodology.dependencies.find((d) => d.score_id === 'F04');
    expect(f04?.limitation).toBeTruthy();
    expect(dmxGrnCalculator.scoreId).toBe('DMX-GRN');
  });

  it('happy path: todas deps (N10/N05/N08/F06/F04) en 80 → value 80, H01_green proxy=N08=80', () => {
    const res = computeDmxGrn({
      subscores: baseSubs(80),
      period: PERIOD,
      data_freshness_days: 5,
      sample_size: 5,
    });
    expect(res.value).toBe(80);
    expect(res.confidence).toBe('high');
    expect(res.components.H01_green?.value).toBe(80);
    expect(res.components.H01_green?.citation_source).toBe('zone_scores:N08');
    expect(res.components._meta.limitation).toBeTruthy();
  });

  it('missing secundario F04 → re-normaliza (F04 no es critical)', () => {
    const subs = baseSubs(70) as Record<string, number | null>;
    delete subs.F04;
    const res = computeDmxGrn({ subscores: subs, period: PERIOD });
    // F04 missing → componentes vivos: N10, N05, N08, F06, H01_green (proxy N08)
    // weights suma = 0.25+0.2+0.2+0.15+0.1 = 0.9; todos 70 → 70
    expect(res.value).toBe(70);
    expect(res.components._meta.redistributed_weights).toBe(true);
    expect(res.components._meta.missing_components).toContain('F04');
  });

  it('missing critical N10 → insufficient_data', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.N10;
    const res = computeDmxGrn({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components._meta.fallback_reason).toBe('critical_dep_missing');
  });

  it('missing critical N08 → insufficient_data + H01_green null (porque deriva de N08)', () => {
    const subs = baseSubs(80) as Record<string, number | null>;
    delete subs.N08;
    const res = computeDmxGrn({ subscores: subs, period: PERIOD });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.H01_green).toBeNull();
  });

  it('edge 0: todas deps en 0 → value 0', () => {
    const res = computeDmxGrn({ subscores: baseSubs(0), period: PERIOD });
    expect(res.value).toBe(0);
    expect(res.components.bucket).toBe('bajo');
  });

  it('edge 100: todas deps en 100 → value 100', () => {
    const res = computeDmxGrn({ subscores: baseSubs(100), period: PERIOD });
    expect(res.value).toBe(100);
    expect(res.components.bucket).toBe('excelente');
  });

  it('circuit breaker: Δ > 20 → flag', () => {
    const res = computeDmxGrn({
      subscores: baseSubs(80),
      period: PERIOD,
      previous_value: 40,
    });
    expect(res.components._meta.circuit_breaker_triggered).toBe(true);
    expect(res.trend_vs_previous).toBe(40);
  });

  it('trend', () => {
    const res = computeDmxGrn({
      subscores: baseSubs(70),
      period: PERIOD,
      previous_value: 65,
    });
    expect(res.trend_vs_previous).toBe(5);
  });

  it('getLabelKey', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.index.grn.excelente');
    expect(getLabelKey(65, 'medium')).toBe('ie.index.grn.alto');
    expect(getLabelKey(45, 'low')).toBe('ie.index.grn.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.index.grn.bajo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.index.grn.insufficient');
  });

  it('run() mock supabase: deps completas', async () => {
    const rows = GRN_FETCH_DEPS.map((d) => ({
      score_type: d,
      score_value: 75,
      computed_at: new Date().toISOString(),
    }));
    const supabase = mockSupabase(rows);
    const out = await dmxGrnCalculator.run(
      { zoneId: 'zone-test', countryCode: 'MX', periodDate: PERIOD },
      supabase,
    );
    expect(out.score_value).toBe(75);
    expect(out.confidence).toBe('high');
    expect(out.citations.length).toBe(GRN_FETCH_DEPS.length);
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
