import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { FetchSignalParams } from '../pulse-signals';
import {
  fetchBusinessNetFlow,
  fetchCalls911,
  fetchEvents,
  fetchPulseSignals,
} from '../pulse-signals';

const PERIOD = '2026-04-01';

function baseParams(overrides: Partial<FetchSignalParams> = {}): FetchSignalParams {
  return {
    zoneId: 'col-1',
    scopeType: 'colonia',
    countryCode: 'MX',
    periodDate: PERIOD,
    supabase: {} as SupabaseClient,
    ...overrides,
  };
}

function zoneScoresClient(n04: number | null, n08: number | null): SupabaseClient {
  const chainable = {
    select() {
      return this;
    },
    eq(field: string, value: unknown) {
      if (field === 'score_type') {
        this._scoreType = value as string;
      }
      return this;
    },
    limit() {
      const st = this._scoreType;
      const value = st === 'N04' ? n04 : st === 'N08' ? n08 : null;
      return Promise.resolve({
        data: value === null ? [] : [{ score_value: value }],
        error: null,
      });
    },
    _scoreType: '' as string,
  };

  const countChainable = {
    select: () => countChainable,
    eq: () => countChainable,
    gte: () => Promise.resolve({ count: 0, error: null }),
  };

  return {
    from(table: string) {
      if (table === 'zone_scores') return chainable;
      if (table.startsWith('denue_')) return countChainable;
      return chainable;
    },
  } as unknown as SupabaseClient;
}

describe('fetchCalls911', () => {
  it('happy path: fetch 200 OK → parse total + confidence 0.8', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, result: { total: 18_120 } }),
    }) as unknown as typeof fetch;

    const res = await fetchCalls911(baseParams({ fetchImpl: mockFetch }));
    expect(res.count).toBe(10); // 18120 / 1812 = 10
    expect(res.confidence).toBe(0.8);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetch throws → null count + confidence 0', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error('network_down')) as unknown as typeof fetch;
    const res = await fetchCalls911(baseParams({ fetchImpl: mockFetch }));
    expect(res.count).toBeNull();
    expect(res.confidence).toBe(0);
  });

  it('fetch non-ok (404) → null + confidence 0', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;
    const res = await fetchCalls911(baseParams({ fetchImpl: mockFetch }));
    expect(res.count).toBeNull();
    expect(res.confidence).toBe(0);
  });

  it('response sin total → null + confidence 0', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, result: {} }),
    }) as unknown as typeof fetch;
    const res = await fetchCalls911(baseParams({ fetchImpl: mockFetch }));
    expect(res.count).toBeNull();
    expect(res.confidence).toBe(0);
  });
});

describe('fetchBusinessNetFlow', () => {
  it('query OK (0 counts) → births=0, deaths=0, confidence=1', async () => {
    const countChainable = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return Promise.resolve({ count: 0, error: null });
      },
    };
    const supabase = {
      from: () => countChainable,
    } as unknown as SupabaseClient;

    const res = await fetchBusinessNetFlow(baseParams({ supabase }));
    expect(res.births).toBe(0);
    expect(res.deaths).toBe(0);
    expect(res.confidence).toBe(1);
  });

  it('query returns counts → births + deaths correctos', async () => {
    let callIdx = 0;
    const countChainable = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        callIdx += 1;
        // primera llamada=births, segunda=deaths
        return Promise.resolve({ count: callIdx === 1 ? 12 : 3, error: null });
      },
    };
    const supabase = {
      from: () => countChainable,
    } as unknown as SupabaseClient;

    const res = await fetchBusinessNetFlow(baseParams({ supabase }));
    expect(res.births).toBe(12);
    expect(res.deaths).toBe(3);
    expect(res.confidence).toBe(1);
  });

  it('tabla no existe (error persistente) → 0/0/0', async () => {
    const countChainable = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return Promise.resolve({ count: null, error: { message: 'relation not found' } });
      },
    };
    const supabase = {
      from: () => countChainable,
    } as unknown as SupabaseClient;

    const res = await fetchBusinessNetFlow(baseParams({ supabase }));
    expect(res.births).toBe(0);
    expect(res.deaths).toBe(0);
    expect(res.confidence).toBe(0);
  });
});

describe('fetchEvents', () => {
  it('H1 stub → count null + confidence 0', async () => {
    const res = await fetchEvents(baseParams());
    expect(res.count).toBeNull();
    expect(res.confidence).toBe(0);
  });
});

describe('fetchPulseSignals (orquestador)', () => {
  it('5 calls paralelo, sources_available cuenta solo confidence > 0', async () => {
    const supabase = zoneScoresClient(80, 60);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, result: { total: 3624 } }),
    }) as unknown as typeof fetch;

    const res = await fetchPulseSignals(baseParams({ supabase, fetchImpl: mockFetch }));

    // business (denue stub path: 0/0 con error en mock zone_scores path? Actually
    // zoneScoresClient returns countChainable for denue_* → count: 0 error:null.
    // Confirm business_net_flow confidence = 1.
    expect(res.per_signal_confidence.business_net_flow).toBe(1);
    // foot_traffic: N04=80 N08=60 → day=40000 night=18000 confidence=0.4
    expect(res.foot_traffic_day).toBe(40_000);
    expect(res.foot_traffic_night).toBe(18_000);
    expect(res.per_signal_confidence.foot_traffic).toBe(0.4);
    // calls_911: 3624 / 1812 = 2
    expect(res.calls_911_count).toBe(2);
    expect(res.per_signal_confidence.calls_911).toBe(0.8);
    // events stub
    expect(res.events_count).toBeNull();
    expect(res.per_signal_confidence.events).toBe(0);
    // ecosystem no se fetchea aquí (pulse-score orchestrator lo hace)
    expect(res.per_signal_confidence.ecosystem).toBe(0);

    // sources_available = business(1) + foot_traffic(0.4) + calls_911(0.8) = 3
    expect(res.sources_available).toBe(3);
  });

  it('todos fallan → sources_available = 0', async () => {
    // zone_scores returns null for N04/N08, denue errors, fetch rejects.
    const supabase = zoneScoresClient(null, null);
    const mockFetch = vi.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch;

    // Override denue to error
    const errorChain = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return Promise.resolve({ count: null, error: { message: 'err' } });
      },
    };
    const from = (table: string) => {
      if (table.startsWith('denue_')) return errorChain;
      return (supabase as unknown as { from: (t: string) => unknown }).from(table);
    };
    const wrapped = { from } as unknown as SupabaseClient;

    const res = await fetchPulseSignals(baseParams({ supabase: wrapped, fetchImpl: mockFetch }));
    expect(res.sources_available).toBe(0);
    expect(res.business_births).toBe(0);
    expect(res.foot_traffic_day).toBeNull();
    expect(res.calls_911_count).toBeNull();
  });
});
