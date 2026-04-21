import { describe, expect, it, vi } from 'vitest';

interface MockRow {
  readonly index_code: string;
  readonly scope_id: string;
  readonly scope_type: string;
  readonly value: number;
  readonly trend_vs_previous: number | null;
  readonly trend_direction: string | null;
  readonly ranking_in_scope: number | null;
  readonly country_code: string;
  readonly period_date: string;
}

function buildRows(code: string, base: number): readonly MockRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    index_code: code,
    scope_id: `${code.toLowerCase()}-zone-${i + 1}`,
    scope_type: 'colonia',
    value: base - i * 1.5,
    trend_vs_previous: i === 0 ? 2.1 : null,
    trend_direction: i === 0 ? 'mejorando' : null,
    ranking_in_scope: i + 1,
    country_code: 'MX',
    period_date: '2026-03-01',
  }));
}

const INDEX_ROWS: Readonly<Record<string, readonly MockRow[]>> = {
  IDS: buildRows('IDS', 90),
  IRE: buildRows('IRE', 85),
  GRN: buildRows('GRN', 80),
};

interface CapturedFilter {
  readonly column: string;
  readonly value: unknown;
}

function createQueryBuilder() {
  const filters: CapturedFilter[] = [];
  let isOrdered = false;
  let limitN: number | null = null;

  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return builder;
    }),
    order: vi.fn(() => {
      isOrdered = true;
      return builder;
    }),
    limit: vi.fn((n: number) => {
      limitN = n;
      return builder;
    }),
    // biome-ignore lint/suspicious/noThenProperty: mock Supabase query builder must be thenable to mimic PostgREST awaitable client
    then<T>(onFulfilled: (value: { data: unknown; error: null }) => T) {
      const codeFilter = filters.find((f) => f.column === 'index_code');
      const code = typeof codeFilter?.value === 'string' ? codeFilter.value : '';
      const rows = INDEX_ROWS[code] ?? [];
      const sliced = isOrdered && limitN !== null ? rows.slice(0, limitN) : rows;
      return Promise.resolve(onFulfilled({ data: sliced, error: null }));
    },
  };
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => createQueryBuilder()),
  })),
}));

describe('aggregateSustainabilityNational', () => {
  it('returns numeric national averages for IDS/IRE/GRN', async () => {
    const { aggregateSustainabilityNational } = await import('../lib/sustainability-aggregator');
    const result = await aggregateSustainabilityNational('MX', '2026-03-01');
    expect(typeof result.ids_national).toBe('number');
    expect(typeof result.ire_national).toBe('number');
    expect(typeof result.grn_national).toBe('number');
    expect(result.igv_national).toBe(result.grn_national);
  });

  it('builds rankings with rank 1..10 entries for each index', async () => {
    const { aggregateSustainabilityNational } = await import('../lib/sustainability-aggregator');
    const result = await aggregateSustainabilityNational('MX', '2026-03-01');
    expect(result.ranking_ids.length).toBe(10);
    expect(result.ranking_ire.length).toBe(10);
    expect(result.ranking_grn.length).toBe(10);
    expect(result.ranking_ids[0]?.rank).toBe(1);
    expect(result.ranking_ids[9]?.rank).toBe(10);
    expect(result.ranking_ids[0]?.zone_id).toBe('ids-zone-1');
    expect(result.ranking_ire[0]?.zone_id).toBe('ire-zone-1');
    expect(result.ranking_grn[0]?.zone_id).toBe('grn-zone-1');
  });

  it('returns "skipped" narrative when no causalHook provided', async () => {
    const { aggregateSustainabilityNational, NARRATIVE_SKIPPED_ES } = await import(
      '../lib/sustainability-aggregator'
    );
    const result = await aggregateSustainabilityNational('MX', '2026-03-01');
    expect(result.narrative_md).toBe(NARRATIVE_SKIPPED_ES);
  });

  it('invokes causalHook and returns generated narrative when provided', async () => {
    const { aggregateSustainabilityNational } = await import('../lib/sustainability-aggregator');
    const causalHook = vi.fn().mockResolvedValue({
      text: 'Narrativa generada',
      citations: ['https://dmx.com/m/ids'],
    });
    const result = await aggregateSustainabilityNational('MX', '2026-03-01', {
      causalHook,
    });
    expect(causalHook).toHaveBeenCalledTimes(1);
    expect(result.narrative_md).toBe('Narrativa generada');
  });
});

describe('formatSustainabilityPrompt', () => {
  it('includes nationals + top 3 references', async () => {
    const { formatSustainabilityPrompt } = await import('../lib/sustainability-aggregator');
    const prompt = formatSustainabilityPrompt({
      countryCode: 'MX',
      periodDate: '2026-03-01',
      idsAvg: 75.5,
      ireAvg: 70.1,
      grnAvg: 60.8,
      topIds: [
        {
          rank: 1,
          zone_id: 'a',
          zone_label: 'Zona A',
          scope_type: 'colonia',
          value: 90.1,
          delta_vs_previous: null,
          trend_direction: null,
        },
      ],
      topIre: [],
      topGrn: [],
    });
    expect(prompt).toContain('75.50');
    expect(prompt).toContain('70.10');
    expect(prompt).toContain('60.80');
    expect(prompt).toContain('Zona A');
    expect(prompt).toContain('IGV alias GRN');
  });
});
