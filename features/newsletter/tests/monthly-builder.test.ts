import { describe, expect, it } from 'vitest';
import { buildMonthlyBundle } from '../lib/monthly-builder';

// Mock minimal supabase client (chainable PostgrestQueryBuilder). Chain
// terminates on .limit() OR .maybeSingle() OR implicit await (then()).
interface MonthlyMockBuilder {
  _rows: unknown;
  select: () => MonthlyMockBuilder;
  eq: () => MonthlyMockBuilder;
  in: () => MonthlyMockBuilder;
  gte: () => MonthlyMockBuilder;
  lte: () => MonthlyMockBuilder;
  order: () => MonthlyMockBuilder;
  not: () => MonthlyMockBuilder;
  limit: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (resolve: (v: { data: unknown; error: null }) => void) => void;
}

function makeSupabaseMock(tables: Record<string, unknown>): unknown {
  return {
    from(name: string) {
      const rows = tables[name] ?? [];
      const qb = { _rows: rows } as MonthlyMockBuilder;
      qb.select = () => qb;
      qb.eq = () => qb;
      qb.in = () => qb;
      qb.gte = () => qb;
      qb.lte = () => qb;
      qb.order = () => qb;
      qb.not = () => qb;
      qb.limit = () => Promise.resolve({ data: qb._rows, error: null });
      qb.maybeSingle = () =>
        Promise.resolve({
          data: Array.isArray(qb._rows) && qb._rows.length > 0 ? qb._rows[0] : null,
          error: null,
        });
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for supabase chainable API
      qb.then = (resolve: (v: { data: unknown; error: null }) => void) => {
        resolve({ data: qb._rows, error: null });
      };
      return qb;
    },
  };
}

describe('buildMonthlyBundle', () => {
  it('builds bundle with hero_top_five + causal_paragraphs + pulse/migration sections', async () => {
    const supabase = makeSupabaseMock({
      dmx_indices: [
        {
          index_code: 'IPV',
          scope_type: 'colonia',
          scope_id: 'roma-norte',
          value: 92.5,
          trend_vs_previous: 2.1,
          ranking_in_scope: 1,
        },
        {
          index_code: 'IPV',
          scope_type: 'colonia',
          scope_id: 'condesa',
          value: 90.3,
          trend_vs_previous: 1.4,
          ranking_in_scope: 2,
        },
      ],
      causal_explanations: [
        { explanation_md: 'Roma Norte subió por aperturas de cafés.' },
        { explanation_md: 'Condesa se mantiene estable con demanda alta.' },
      ],
      zone_pulse_scores: [
        {
          scope_type: 'colonia',
          scope_id: 'roma-norte',
          pulse_score: 88.1,
          period_date: '2026-03-01',
        },
      ],
      zone_migration_flows: [
        {
          origin_scope_type: 'colonia',
          origin_scope_id: 'napoles',
          dest_scope_type: 'colonia',
          dest_scope_id: 'roma-norte',
          volume: 320,
        },
      ],
    });

    const bundle = await buildMonthlyBundle({
      countryCode: 'MX',
      periodDate: '2026-03-01',
      locale: 'es-MX',
      supabase: supabase as never,
    });

    expect(bundle.country_code).toBe('MX');
    expect(bundle.period_date).toBe('2026-03-01');
    expect(bundle.locale).toBe('es-MX');
    expect(bundle.hero_top_five.length).toBeGreaterThanOrEqual(2);
    expect(bundle.hero_top_five[0]?.zone_label).toBeTruthy();
    // Zone labels resolved (zero UUIDs visible in UI).
    for (const h of bundle.hero_top_five) {
      expect(h.zone_label).not.toMatch(/^[0-9a-f]{8}-/);
    }
    expect(bundle.causal_paragraphs.length).toBeGreaterThan(0);
    expect(bundle.cta.url).toMatch(/\/indices$/);
  });

  it('omits sections when subscriber preferences disable them', async () => {
    const supabase = makeSupabaseMock({
      dmx_indices: [
        {
          index_code: 'IPV',
          scope_type: 'colonia',
          scope_id: 'roma-norte',
          value: 92.5,
          trend_vs_previous: 2.1,
          ranking_in_scope: 1,
        },
      ],
      causal_explanations: [],
      zone_pulse_scores: [],
      zone_migration_flows: [],
    });

    const bundle = await buildMonthlyBundle({
      countryCode: 'MX',
      periodDate: '2026-03-01',
      locale: 'es-MX',
      subscriberPreferences: {
        frequency: 'monthly',
        zone_scope_ids: [],
        sections: {
          pulse: false,
          migration: false,
          causal: false,
          alpha: false,
          scorecard: false,
          streaks: false,
        },
      },
      supabase: supabase as never,
    });

    expect(bundle.pulse_section).toBeNull();
    expect(bundle.migration_section).toBeNull();
    expect(bundle.streaks_section).toBeNull();
    expect(bundle.causal_paragraphs).toEqual([]);
  });
});
