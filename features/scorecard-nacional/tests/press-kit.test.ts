import { describe, expect, it, vi } from 'vitest';
import type { ScorecardBundle } from '../types';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: 'x' }, error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://stub.supabase/press-kit/x' },
        })),
      })),
    },
  })),
}));

function buildMinimalBundle(): ScorecardBundle {
  return {
    report_id: 'MX-2026-Q1',
    country_code: 'MX',
    period_type: 'quarterly',
    period_date: '2026-01-01',
    hero_insights: [],
    pulse_hero: {
      country_code: 'MX',
      period_date: '2026-01-01',
      pulse_national: 72.4,
      delta_vs_previous: 1.8,
      top_zones: [{ zone_id: 'z1', zone_label: 'Roma Norte', pulse: 88.1, delta: 2.3 }],
      bottom_zones: [{ zone_id: 'z3', zone_label: 'Zona Prueba', pulse: 34.2, delta: -1.2 }],
    },
    executive_narrative: {
      country_code: 'MX',
      period_date: '2026-01-01',
      summary_md: 'Resumen.',
      zone_stories: [],
      generated_at: '2026-04-21T10:00:00.000Z',
    },
    sustainability: {
      country_code: 'MX',
      period_date: '2026-01-01',
      ids_national: 68.2,
      ire_national: 64.1,
      igv_national: 52.8,
      grn_national: 59.4,
      ranking_ids: [],
      ranking_ire: [],
      ranking_grn: [],
      narrative_md: 'Sostenibilidad.',
    },
    rankings: [],
    magnet_exodus: {
      country_code: 'MX',
      period_date: '2026-01-01',
      top_magnets: [
        {
          zone_id: 'z1',
          zone_label: 'Roma Norte',
          scope_type: 'colonia',
          country_code: 'MX',
          period_date: '2026-01-01',
          inflow: 2100,
          outflow: 800,
          net_flow: 1300,
          net_flow_pct: 0.447,
          tier: 'magnet',
          rank: 1,
        },
      ],
      top_exodus: [
        {
          zone_id: 'z9',
          zone_label: 'Polanco Viejo',
          scope_type: 'colonia',
          country_code: 'MX',
          period_date: '2026-01-01',
          inflow: 400,
          outflow: 1200,
          net_flow: -800,
          net_flow_pct: -0.5,
          tier: 'exodus',
          rank: 1,
        },
      ],
      prose_md: null,
    },
    alpha_lifecycle: {
      country_code: 'MX',
      period_date: '2026-01-01',
      counts_by_state: {
        emerging: 5,
        alpha: 12,
        peaked: 4,
        matured: 20,
        declining: 3,
      },
      transitions_this_period: [],
      case_studies: [
        {
          zone_id: 'z1',
          zone_label: 'Roma Norte',
          current_state: 'emerging',
          years_in_state: 2,
          signature_signals: ['chef early movers', 'specialty cafes'],
          story_md: 'Caso de estudio.',
          timeline: [],
        },
      ],
    },
    top_timelines: [],
    methodology_version: 'v1.0',
    generated_at: '2026-04-21T10:00:00.000Z',
  };
}

describe('renderReleaseMd — deterministic', () => {
  it('contains headline and formatted date', async () => {
    const { renderReleaseMd } = await import('../lib/press-kit');
    const bundle = buildMinimalBundle();
    const md = renderReleaseMd(bundle);

    expect(md).toContain('Scorecard Nacional');
    expect(md).toContain('Q1 2026');
    expect(md).toContain('de abril de 2026');
    expect(md).toContain('MX-2026-Q1');
    expect(md).toContain('prensa@desarrollos.mx');
  });

  it('is deterministic given same bundle input', async () => {
    const { renderReleaseMd } = await import('../lib/press-kit');
    const bundle = buildMinimalBundle();
    const md1 = renderReleaseMd(bundle);
    const md2 = renderReleaseMd(bundle);
    expect(md1).toBe(md2);
  });

  it('reflects pulse_national value in headline', async () => {
    const { renderReleaseMd } = await import('../lib/press-kit');
    const bundle = buildMinimalBundle();
    const md = renderReleaseMd(bundle);
    expect(md).toContain('72.4');
  });
});

describe('generatePressKit — smoke', () => {
  it('returns exactly 3 quotes and 5 charts', async () => {
    const { generatePressKit } = await import('../lib/press-kit');
    const bundle = buildMinimalBundle();
    const narrativeHook = vi.fn(async () => 'Quote stub en español.');

    const kit = await generatePressKit(bundle, narrativeHook);

    expect(kit.quotes.length).toBe(3);
    expect(kit.charts.length).toBe(5);
    expect(kit.report_id).toBe('MX-2026-Q1');
    expect(kit.published_url).toBe('/press/scorecard-mx-2026-q1');
    expect(kit.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Quote attributions fixed.
    expect(kit.quotes[0]?.attribution).toContain('CEO DMX');
    expect(kit.quotes[1]?.attribution).toContain('Head of Research DMX');
    expect(kit.quotes[2]?.attribution).toContain('Head of Data DMX');

    // Chart slugs.
    const slugs = kit.charts.map((c) => c.slug);
    expect(slugs).toEqual([
      'pulse-national-trend',
      'top-magnets-ranking',
      'top-exodus-ranking',
      'alpha-lifecycle-sankey',
      'sustainability-ids-top10',
    ]);

    expect(narrativeHook).toHaveBeenCalledTimes(3);
  }, 30_000);

  it('release_md contains headline even when narrativeHook returns empty', async () => {
    const { generatePressKit } = await import('../lib/press-kit');
    const bundle = buildMinimalBundle();
    const narrativeHook = vi.fn(async () => '');

    const kit = await generatePressKit(bundle, narrativeHook);
    expect(kit.release_md).toContain('Scorecard Nacional');
    expect(kit.quotes.length).toBe(3);
    for (const q of kit.quotes) {
      expect(q.quote_md.length).toBeGreaterThan(0);
    }
  }, 30_000);
});
