import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import {
  buildPulseHero,
  formatPulseHeroHeadline,
  PULSE_DMX_BRAND,
  previousMonthPeriod,
} from '../lib/pulse-hero';

type TestSupabase = SupabaseClient<Database>;

interface PulseRowFixture {
  scope_id: string;
  pulse_score: number | null;
}

function createFakeSupabase(
  responses: Record<string, { data: PulseRowFixture[]; error: null }>,
): TestSupabase {
  const from = vi.fn((table: string) => {
    // Each call to from() returns a new builder that resolves to whatever
    // the queue says matches `table + period_date`. We chain select/eq calls
    // and capture the final period_date on the last .eq('period_date', ...).
    let capturedPeriod: string | null = null;
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn((col: string, value: string) => {
      if (col === 'period_date') capturedPeriod = value;
      // When .eq is the last call in the chain, the builder itself must be
      // thenable so `await` resolves to { data, error }.
      return builder;
    });
    // biome-ignore lint/suspicious/noThenProperty: mimic Postgrest thenable.
    builder.then = (resolve: (v: { data: PulseRowFixture[]; error: null }) => void) => {
      const key = `${table}:${capturedPeriod ?? 'NONE'}`;
      const fixture = responses[key] ?? { data: [], error: null };
      resolve(fixture);
    };
    return builder;
  });
  return { from } as unknown as TestSupabase;
}

describe('buildPulseHero', () => {
  it('computes pulse_national as the rounded AVG of current rows', async () => {
    const currentRows: PulseRowFixture[] = [
      { scope_id: 'z1', pulse_score: 80 },
      { scope_id: 'z2', pulse_score: 70 },
      { scope_id: 'z3', pulse_score: 60 },
      { scope_id: 'z4', pulse_score: 90 },
      { scope_id: 'z5', pulse_score: 55 },
      { scope_id: 'z6', pulse_score: 65 },
      { scope_id: 'z7', pulse_score: 75 },
      { scope_id: 'z8', pulse_score: 85 },
      { scope_id: 'z9', pulse_score: 50 },
      { scope_id: 'z10', pulse_score: 40 },
    ];
    const previousRows: PulseRowFixture[] = currentRows.map((r) => ({
      scope_id: r.scope_id,
      pulse_score: (r.pulse_score ?? 0) - 5,
    }));
    const supabase = createFakeSupabase({
      'zone_pulse_scores:2026-03-01': { data: currentRows, error: null },
      'zone_pulse_scores:2026-02-01': { data: previousRows, error: null },
    });

    const result = await buildPulseHero('MX', '2026-03-01', { supabase });

    const expectedAvg = Math.round(
      currentRows.reduce((a, b) => a + (b.pulse_score ?? 0), 0) / currentRows.length,
    );
    expect(result.pulse_national).toBe(expectedAvg);
    expect(result.delta_vs_previous).not.toBeNull();
    expect(result.top_zones).toHaveLength(5);
    expect(result.bottom_zones).toHaveLength(5);
    // Top should be highest first (z4=90), bottom lowest first (z10=40).
    expect(result.top_zones[0]?.zone_id).toBe('z4');
    expect(result.bottom_zones[0]?.zone_id).toBe('z10');
  });

  it('returns pulse_national=0 and delta null when no data is present', async () => {
    const supabase = createFakeSupabase({});
    const result = await buildPulseHero('MX', '2026-03-01', { supabase });
    expect(result.pulse_national).toBe(0);
    expect(result.delta_vs_previous).toBeNull();
    expect(result.top_zones).toHaveLength(0);
    expect(result.bottom_zones).toHaveLength(0);
  });
});

describe('formatPulseHeroHeadline', () => {
  it('contains the word Pulse and the national score', () => {
    const headline = formatPulseHeroHeadline(
      {
        country_code: 'MX',
        period_date: '2026-03-01',
        pulse_national: 73,
        delta_vs_previous: 2,
        top_zones: [],
        bottom_zones: [],
      },
      'MX',
      'Q1 2026',
    );
    expect(headline).toContain('Pulse');
    expect(headline).toContain('73');
    expect(headline).toContain('MX');
    expect(headline).toContain('Q1 2026');
  });
});

describe('previousMonthPeriod', () => {
  it('rolls back across the year boundary', () => {
    expect(previousMonthPeriod('2026-01-01')).toBe('2025-12-01');
  });
  it('rolls back within the same year', () => {
    expect(previousMonthPeriod('2026-03-01')).toBe('2026-02-01');
  });
});

describe('PULSE_DMX_BRAND', () => {
  it('exposes the canonical hero hierarchy order', () => {
    expect(PULSE_DMX_BRAND.hero_hierarchy_order[0]).toBe('PULSE');
    expect(PULSE_DMX_BRAND.official_name).toBe('Pulse DMX');
  });
});
