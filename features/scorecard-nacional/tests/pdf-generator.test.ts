import { describe, expect, it, vi } from 'vitest';
import type { ScorecardBundle } from '../types';

// Mock Supabase admin client so tests never hit the network. Upload returns
// success; getPublicUrl returns a stub URL.
vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: 'x' }, error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://stub.supabase/reports/x.pdf' },
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
      top_zones: [
        { zone_id: 'z1', zone_label: 'Roma Norte', pulse: 88.1, delta: 2.3 },
        { zone_id: 'z2', zone_label: 'Condesa', pulse: 86.4, delta: 1.1 },
      ],
      bottom_zones: [{ zone_id: 'z3', zone_label: 'Zona Prueba', pulse: 34.2, delta: -1.2 }],
    },
    executive_narrative: {
      country_code: 'MX',
      period_date: '2026-01-01',
      summary_md: 'Resumen ejecutivo línea 1.\n\nResumen ejecutivo línea 2.',
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
      ranking_ids: [
        {
          rank: 1,
          zone_id: 'z1',
          zone_label: 'Roma Norte',
          scope_type: 'colonia',
          value: 82.1,
          delta_vs_previous: 0.8,
          trend_direction: 'mejorando',
        },
      ],
      ranking_ire: [],
      ranking_grn: [],
      narrative_md: 'Sostenibilidad narrativa.',
    },
    rankings: [
      {
        index_code: 'IPV',
        index_label: 'Índice de Plusvalía',
        top_20: [
          {
            rank: 1,
            zone_id: 'z1',
            zone_label: 'Roma Norte',
            scope_type: 'colonia',
            value: 95.2,
            delta_vs_previous: 1.2,
            trend_direction: 'mejorando',
          },
        ],
        methodology_url: '/metodologia/ipv',
      },
    ],
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
      prose_md: 'Narrativa magnet-exodus.\n\nSegundo párrafo.',
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
      transitions_this_period: [
        {
          zone_id: 'z1',
          zone_label: 'Roma Norte',
          from_state: 'alpha',
          to_state: 'peaked',
          detected_at: '2026-01-15',
          alpha_score_at_transition: 87.3,
        },
      ],
      case_studies: [
        {
          zone_id: 'z1',
          zone_label: 'Roma Norte',
          current_state: 'emerging',
          years_in_state: 2,
          signature_signals: ['chef early movers', 'specialty cafes'],
          story_md: 'Relato del caso de estudio.',
          timeline: [
            {
              zone_id: 'z1',
              zone_label: 'Roma Norte',
              from_state: null,
              to_state: 'emerging',
              detected_at: '2024-01-01',
              alpha_score_at_transition: 62.1,
            },
          ],
        },
      ],
    },
    top_timelines: [
      {
        zone_id: 'z1',
        zone_label: 'Roma Norte',
        country_code: 'MX',
        months_covered: 12,
        entries: [],
        narrative_md: 'Narrativa del timeline.',
        alpha_journey_md: 'Trayectoria alpha.',
      },
    ],
    methodology_version: 'v1.0',
    generated_at: '2026-04-21T10:00:00.000Z',
  };
}

describe('generateScorecardPdf — smoke', () => {
  it('renders and returns bytes + duration for a minimal bundle', async () => {
    const { generateScorecardPdf } = await import('../lib/pdf-generator');
    const bundle = buildMinimalBundle();

    const result = await generateScorecardPdf(bundle);

    expect(result).toBeDefined();
    expect(typeof result.pdf_url).toBe('string');
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('caps rendering at 15 rankings and emits warn without throwing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { generateScorecardPdf } = await import('../lib/pdf-generator');

    const bundle = buildMinimalBundle();
    const extraRankings = Array.from({ length: 20 }, (_, idx) => ({
      index_code: `X${idx}`,
      index_label: `Extra ${idx}`,
      top_20: bundle.rankings[0]?.top_20 ?? [],
      methodology_url: '/metodologia/x',
    }));
    const overloaded: ScorecardBundle = { ...bundle, rankings: extraRankings };

    const result = await generateScorecardPdf(overloaded);
    expect(result.bytes).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  }, 30_000);
});
