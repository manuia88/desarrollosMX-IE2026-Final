import { describe, expect, it, vi } from 'vitest';
import type { PulseSignalKey, PulseSignals } from '@/features/pulse-score/types';
import { PULSE_SIGNAL_KEYS, PULSE_WEIGHTS } from '@/features/pulse-score/types';
import { computePulseScore, methodology, runPulseScoreForScope, version } from '../pulse-score';

const PERIOD = '2026-04-01';

function makeSignals(
  overrides: Partial<PulseSignals> = {},
  confidences: Partial<Record<PulseSignalKey, number>> = {},
): PulseSignals {
  const per_signal_confidence = {
    business_net_flow: 1,
    foot_traffic: 1,
    calls_911: 1,
    events: 1,
    ecosystem: 1,
    ...confidences,
  };
  let sources_available = 0;
  for (const key of PULSE_SIGNAL_KEYS) {
    if ((per_signal_confidence[key] ?? 0) > 0) sources_available += 1;
  }
  return {
    business_births: 10,
    business_deaths: 5,
    foot_traffic_day: 20_000,
    foot_traffic_night: 10_000,
    calls_911_count: 50,
    events_count: 10,
    construction_permits_count: null,
    sources_available,
    per_signal_confidence,
    ...overrides,
  };
}

describe('Pulse Score — computePulseScore (pure)', () => {
  it('version + PULSE_WEIGHTS sum = 1 + methodology declared', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const sum = Object.values(PULSE_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(methodology.confidence_thresholds.min_sources_available).toBe(3);
  });

  it('happy path 5 fuentes → value > 0 + confidence high + coverage 100', () => {
    const signals = makeSignals();
    const res = computePulseScore({
      signals,
      ecosystem_score: 75,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('high');
    expect(res.components.coverage_pct).toBe(100);
    expect(res.components.data_sources_available).toBe(5);
    expect(res.value).toBeGreaterThan(0);
    expect(res.value).toBeLessThanOrEqual(100);
  });

  it('3 fuentes (2 missing) → confidence low + renormalization de pesos', () => {
    const signals = makeSignals(
      {
        foot_traffic_day: null,
        foot_traffic_night: null,
        events_count: null,
      },
      { foot_traffic: 0, events: 0 },
    );
    const res = computePulseScore({
      signals,
      ecosystem_score: 70,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('low');
    expect(res.components.data_sources_available).toBe(3);
    expect(res.components.foot_traffic.available).toBe(false);
    expect(res.components.events.available).toBe(false);
    const wsum = Object.values(res.components.weights_used).reduce((s, v) => s + v, 0);
    expect(wsum).toBeCloseTo(1, 3);
  });

  it('2 fuentes → value 0 + confidence insufficient_data', () => {
    const signals = makeSignals(
      {
        business_births: 0,
        business_deaths: 0,
        foot_traffic_day: null,
        foot_traffic_night: null,
        calls_911_count: null,
        events_count: null,
      },
      {
        business_net_flow: 1,
        foot_traffic: 0,
        calls_911: 0,
        events: 0,
        ecosystem: 1,
      },
    );
    const res = computePulseScore({
      signals,
      ecosystem_score: 70,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.data_sources_available).toBe(2);
  });

  it('4 fuentes → confidence medium', () => {
    const signals = makeSignals({ events_count: null }, { events: 0 });
    const res = computePulseScore({
      signals,
      ecosystem_score: 70,
      period_date: PERIOD,
    });
    expect(res.confidence).toBe('medium');
    expect(res.components.data_sources_available).toBe(4);
  });

  it('calls_911 alto (malo) reduce score (inversión aplicada)', () => {
    const low911 = computePulseScore({
      signals: makeSignals({ calls_911_count: 10 }),
      ecosystem_score: 70,
      period_date: PERIOD,
    });
    const high911 = computePulseScore({
      signals: makeSignals({ calls_911_count: 500 }),
      ecosystem_score: 70,
      period_date: PERIOD,
    });
    expect(low911.value).toBeGreaterThan(high911.value);
  });

  it('components carry {value, weight, source, available}', () => {
    const res = computePulseScore({
      signals: makeSignals(),
      ecosystem_score: 80,
      period_date: PERIOD,
    });
    expect(res.components.business_net_flow).toMatchObject({
      available: true,
      source: expect.stringContaining('denue'),
    });
    expect(res.components.business_net_flow.weight).toBeGreaterThan(0);
    expect(res.components.ecosystem.value).toBe(80);
  });
});

describe('Pulse Score — runPulseScoreForScope (UPSERT)', () => {
  it('happy path: UPSERT con shape correcto a zone_pulse_scores', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });

    const chainable = {
      select: () => chainable,
      eq: () => chainable,
      limit: () => Promise.resolve({ data: [{ score_value: 72 }], error: null }),
      gte: () => chainable,
      upsert: upsertSpy,
    };

    const countChainable = {
      select: () => countChainable,
      eq: () => countChainable,
      gte: () => Promise.resolve({ count: 0, error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'zone_pulse_scores') return { upsert: upsertSpy };
      if (table.startsWith('denue_')) return countChainable;
      return chainable;
    });

    const supabase = { from } as unknown as Parameters<typeof runPulseScoreForScope>[0]['supabase'];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, result: { total: 5000 } }),
    }) as unknown as typeof fetch;

    const res = await runPulseScoreForScope({
      scopeType: 'colonia',
      scopeId: 'col-test-1',
      countryCode: 'MX',
      periodDate: PERIOD,
      supabase,
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.scopeId).toBe('col-test-1');
      expect(res.value).toBeGreaterThanOrEqual(0);
    }
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [row, opts] = upsertSpy.mock.calls[0] as [
      Record<string, unknown>,
      { onConflict: string },
    ];
    expect(row).toMatchObject({
      scope_type: 'colonia',
      scope_id: 'col-test-1',
      country_code: 'MX',
      period_date: PERIOD,
    });
    expect(row.pulse_score).toBeTypeOf('number');
    expect(row.confidence).toBeTypeOf('string');
    expect(row.components).toBeDefined();
    expect(opts.onConflict).toBe('scope_type,scope_id,country_code,period_date');
  });

  it('upsert error → ok: false + error message', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: { message: 'rls_denied' } });

    const chainable = {
      select: () => chainable,
      eq: () => chainable,
      limit: () => Promise.resolve({ data: [{ score_value: 72 }], error: null }),
      gte: () => chainable,
    };

    const countChainable = {
      select: () => countChainable,
      eq: () => countChainable,
      gte: () => Promise.resolve({ count: 0, error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'zone_pulse_scores') return { upsert: upsertSpy };
      if (table.startsWith('denue_')) return countChainable;
      return chainable;
    });

    const supabase = { from } as unknown as Parameters<typeof runPulseScoreForScope>[0]['supabase'];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, result: { total: 5000 } }),
    }) as unknown as typeof fetch;

    const res = await runPulseScoreForScope({
      scopeType: 'colonia',
      scopeId: 'col-err-1',
      countryCode: 'MX',
      periodDate: PERIOD,
      supabase,
      fetchImpl: mockFetch,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('rls_denied');
    }
  });
});
