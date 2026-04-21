import { describe, expect, it, vi } from 'vitest';
import {
  formatExecutivePrompt,
  formatZoneStoryPrompt,
  generateExecutiveNarrative,
} from '../lib/executive-narrative';
import type {
  AlphaLifecycleSummary,
  CausalTimelineBundle,
  MagnetExodusRanking,
  PulseHeroMetric,
  ScorecardBundle,
  ScorecardRankingSection,
} from '../types';

function buildPulse(): PulseHeroMetric {
  return {
    country_code: 'MX',
    period_date: '2026-03-01',
    pulse_national: 72.5,
    delta_vs_previous: 1.8,
    top_zones: [
      { zone_id: 'roma-norte', zone_label: 'Roma Norte', pulse: 88.1, delta: 2.4 },
      { zone_id: 'condesa', zone_label: 'Condesa', pulse: 85.3, delta: 1.2 },
      { zone_id: 'polanco', zone_label: 'Polanco', pulse: 83.0, delta: 0.9 },
    ],
    bottom_zones: [
      { zone_id: 'iztapalapa-n', zone_label: 'Iztapalapa Norte', pulse: 38.2, delta: -1.1 },
    ],
  };
}

function buildMagnetExodus(): MagnetExodusRanking {
  return {
    country_code: 'MX',
    period_date: '2026-03-01',
    top_magnets: [
      {
        zone_id: 'roma-norte',
        zone_label: 'Roma Norte',
        scope_type: 'colonia',
        country_code: 'MX',
        period_date: '2026-03-01',
        inflow: 1200,
        outflow: 400,
        net_flow: 800,
        net_flow_pct: 0.5,
        tier: 'magnet',
        rank: 1,
      },
    ],
    top_exodus: [
      {
        zone_id: 'xochimilco-s',
        zone_label: 'Xochimilco Sur',
        scope_type: 'colonia',
        country_code: 'MX',
        period_date: '2026-03-01',
        inflow: 200,
        outflow: 700,
        net_flow: -500,
        net_flow_pct: -0.55,
        tier: 'exodus',
        rank: 1,
      },
    ],
    prose_md: null,
  };
}

function buildAlpha(): AlphaLifecycleSummary {
  return {
    country_code: 'MX',
    period_date: '2026-03-01',
    counts_by_state: {
      emerging: 5,
      alpha: 8,
      peaked: 3,
      matured: 12,
      declining: 2,
    },
    transitions_this_period: [
      {
        zone_id: 'escandon',
        zone_label: 'Escandón',
        from_state: 'emerging',
        to_state: 'alpha',
        detected_at: '2026-02-15',
        alpha_score_at_transition: 78.4,
        reason: 'alpha_score sustained >=65 for 3 months',
      },
    ],
    case_studies: [
      {
        zone_id: 'roma-norte',
        zone_label: 'Roma Norte',
        current_state: 'alpha',
        years_in_state: 4,
        signature_signals: ['chef early movers'],
        story_md: 'story',
        timeline: [],
      },
    ],
  };
}

function buildRankings(): readonly ScorecardRankingSection[] {
  return [
    {
      index_code: 'IPV',
      index_label: 'Plusvalía',
      methodology_url: 'https://dmx/m/ipv',
      top_20: [
        {
          rank: 1,
          zone_id: 'roma-norte',
          zone_label: 'Roma Norte',
          scope_type: 'colonia',
          value: 92.3,
          delta_vs_previous: 2.1,
          trend_direction: 'mejorando',
        },
      ],
    },
    {
      index_code: 'IAB',
      index_label: 'Amenidades',
      methodology_url: 'https://dmx/m/iab',
      top_20: [
        {
          rank: 1,
          zone_id: 'polanco',
          zone_label: 'Polanco',
          scope_type: 'colonia',
          value: 89.0,
          delta_vs_previous: 0.4,
          trend_direction: 'estable',
        },
      ],
    },
    {
      index_code: 'IDS',
      index_label: 'Sostenibilidad',
      methodology_url: 'https://dmx/m/ids',
      top_20: [
        {
          rank: 1,
          zone_id: 'coyoacan',
          zone_label: 'Coyoacán',
          scope_type: 'colonia',
          value: 85.6,
          delta_vs_previous: 1.3,
          trend_direction: 'mejorando',
        },
      ],
    },
  ];
}

function buildTimelines(): readonly CausalTimelineBundle[] {
  const zones = [
    { id: 'roma-norte', label: 'Roma Norte' },
    { id: 'condesa', label: 'Condesa' },
    { id: 'polanco', label: 'Polanco' },
    { id: 'escandon', label: 'Escandón' },
    { id: 'coyoacan', label: 'Coyoacán' },
  ];
  return zones.map((z) => ({
    zone_id: z.id,
    zone_label: z.label,
    country_code: 'MX',
    months_covered: 12,
    entries: [],
    narrative_md: 'n/a',
    alpha_journey_md: null,
  }));
}

function buildBundle(): Omit<ScorecardBundle, 'executive_narrative'> {
  return {
    report_id: 'MX-2026-Q1',
    country_code: 'MX',
    period_type: 'quarterly',
    period_date: '2026-03-01',
    hero_insights: [],
    pulse_hero: buildPulse(),
    sustainability: {
      country_code: 'MX',
      period_date: '2026-03-01',
      ids_national: 70,
      ire_national: 68,
      igv_national: 65,
      grn_national: 65,
      ranking_ids: [],
      ranking_ire: [],
      ranking_grn: [],
      narrative_md: 'na',
    },
    rankings: buildRankings(),
    magnet_exodus: buildMagnetExodus(),
    alpha_lifecycle: buildAlpha(),
    top_timelines: buildTimelines(),
    methodology_version: 'v1',
    generated_at: '2026-04-20T12:00:00Z',
  };
}

describe('formatExecutivePrompt', () => {
  it('includes pulse, magnet, alpha and top rankings keys', () => {
    const bundle = buildBundle();
    const prompt = formatExecutivePrompt(bundle);
    expect(prompt).toContain('Pulse Nacional');
    expect(prompt).toContain('Migration Flow');
    expect(prompt).toContain('Alpha Lifecycle');
    expect(prompt).toContain('IPV');
    expect(prompt).toContain('IAB');
    expect(prompt).toContain('IDS');
    expect(prompt).toContain('Roma Norte');
    expect(prompt).toContain('2026-03-01');
  });
});

describe('formatZoneStoryPrompt', () => {
  it('includes pulse, alpha_state and IPV for the zone', () => {
    const bundle = buildBundle();
    const prompt = formatZoneStoryPrompt('roma-norte', 'Roma Norte', bundle);
    expect(prompt).toContain('Roma Norte');
    expect(prompt).toContain('pulse=88.1');
    expect(prompt).toContain('alpha_state=alpha');
    expect(prompt).toContain('IPV=92.3');
  });
});

describe('generateExecutiveNarrative', () => {
  it('produces summary + 5 zone stories calling causalHook 6 times', async () => {
    const bundle = buildBundle();
    const causalHook = vi.fn().mockResolvedValue({
      text: 'Stub narrative',
      citations: ['https://dmx.com/methodology'],
    });
    const result = await generateExecutiveNarrative(bundle, causalHook);
    expect(result.summary_md.length).toBeGreaterThan(0);
    expect(result.summary_md).toBe('Stub narrative');
    expect(result.zone_stories.length).toBe(5);
    expect(causalHook).toHaveBeenCalledTimes(6);
    expect(result.country_code).toBe('MX');
    expect(result.period_date).toBe('2026-03-01');
    expect(result.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const first = result.zone_stories[0];
    expect(first?.story_md).toBe('Stub narrative');
  });
});
