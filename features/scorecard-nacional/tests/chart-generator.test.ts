import { describe, expect, it } from 'vitest';
import { type ChartData, dimensionsFor, renderChartSVG, svgToBuffer } from '../lib/chart-generator';
import type {
  AlphaLifecycleSummary,
  MagnetExodusRanking,
  SustainabilityNationalSection,
} from '../types';

function buildMagnetExodus(): MagnetExodusRanking {
  return {
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
      {
        zone_id: 'z2',
        zone_label: 'Condesa',
        scope_type: 'colonia',
        country_code: 'MX',
        period_date: '2026-01-01',
        inflow: 1800,
        outflow: 900,
        net_flow: 900,
        net_flow_pct: 0.333,
        tier: 'magnet',
        rank: 2,
      },
      {
        zone_id: 'z3',
        zone_label: 'Narvarte',
        scope_type: 'colonia',
        country_code: 'MX',
        period_date: '2026-01-01',
        inflow: 1500,
        outflow: 900,
        net_flow: 600,
        net_flow_pct: 0.25,
        tier: 'magnet',
        rank: 3,
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
  };
}

function buildAlphaSummary(): AlphaLifecycleSummary {
  return {
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
    case_studies: [],
  };
}

function buildSustainability(): SustainabilityNationalSection {
  return {
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
        delta_vs_previous: 1.2,
        trend_direction: 'mejorando',
      },
      {
        rank: 2,
        zone_id: 'z2',
        zone_label: 'Condesa',
        scope_type: 'colonia',
        value: 79.3,
        delta_vs_previous: 0.4,
        trend_direction: 'estable',
      },
      {
        rank: 3,
        zone_id: 'z3',
        zone_label: 'Del Valle',
        scope_type: 'colonia',
        value: 77.5,
        delta_vs_previous: -0.2,
        trend_direction: 'estable',
      },
    ],
    ranking_ire: [],
    ranking_grn: [],
    narrative_md: 'Sostenibilidad.',
  };
}

describe('renderChartSVG — output shape', () => {
  it('returns a valid <svg>...</svg> string', () => {
    const svg = renderChartSVG({
      kind: 'top-magnets-ranking',
      title: 'Top Magnets',
      ranking: buildMagnetExodus(),
    });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('embeds the chart title text node', () => {
    const svg = renderChartSVG({
      kind: 'top-magnets-ranking',
      title: 'Top Magnets Q1',
      ranking: buildMagnetExodus(),
    });
    expect(svg).toContain('Top Magnets Q1');
  });
});

describe('renderChartSVG — platform dimensions', () => {
  it('uses twitter 1200x675 by default', () => {
    const svg = renderChartSVG({
      kind: 'alpha-lifecycle-sankey',
      title: 'Alpha',
      summary: buildAlphaSummary(),
    });
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="675"');
  });

  it('switches to instagram 1080x1080 when requested', () => {
    const svg = renderChartSVG(
      { kind: 'alpha-lifecycle-sankey', title: 'Alpha', summary: buildAlphaSummary() },
      { platform: 'instagram' },
    );
    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1080"');
  });

  it('switches to linkedin 1200x627 when requested', () => {
    const svg = renderChartSVG(
      { kind: 'alpha-lifecycle-sankey', title: 'Alpha', summary: buildAlphaSummary() },
      { platform: 'linkedin' },
    );
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="627"');
  });

  it('dimensionsFor returns the expected pairs', () => {
    expect(dimensionsFor('twitter')).toEqual({ width: 1200, height: 675 });
    expect(dimensionsFor('instagram')).toEqual({ width: 1080, height: 1080 });
    expect(dimensionsFor('linkedin')).toEqual({ width: 1200, height: 627 });
  });
});

describe('renderChartSVG — data rendering', () => {
  it('renders top 3 magnet zones as text nodes', () => {
    const svg = renderChartSVG({
      kind: 'top-magnets-ranking',
      title: 'Top Magnets',
      ranking: buildMagnetExodus(),
    });
    expect(svg).toContain('Roma Norte');
    expect(svg).toContain('Condesa');
    expect(svg).toContain('Narvarte');
  });

  it('renders sustainability top zones', () => {
    const svg = renderChartSVG({
      kind: 'sustainability-ids-top10',
      title: 'IDS Top 10',
      section: buildSustainability(),
    });
    expect(svg).toContain('Roma Norte');
    expect(svg).toContain('Del Valle');
  });

  it('renders alpha lifecycle state labels', () => {
    const svg = renderChartSVG({
      kind: 'alpha-lifecycle-sankey',
      title: 'Alpha Lifecycle',
      summary: buildAlphaSummary(),
    });
    expect(svg).toContain('Alpha');
    expect(svg).toContain('Emerging');
    expect(svg).toContain('Matured');
  });

  it('renders pulse trend with plotted points', () => {
    const svg = renderChartSVG({
      kind: 'pulse-national-trend',
      title: 'Pulso Nacional',
      points: [
        { period_date: '2025-10', value: 68 },
        { period_date: '2025-11', value: 70.2 },
        { period_date: '2025-12', value: 72.4 },
      ],
    });
    expect(svg).toContain('<path');
    expect(svg).toContain('<circle');
  });
});

describe('renderChartSVG — empty data graceful fallback', () => {
  it('returns placeholder SVG with "Datos insuficientes" message for empty pulse', () => {
    const svg = renderChartSVG({
      kind: 'pulse-national-trend',
      title: 'Pulso Nacional',
      points: [],
    });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Datos insuficientes');
  });

  it('returns placeholder for empty rankings', () => {
    const svg = renderChartSVG({
      kind: 'top-magnets-ranking',
      title: 'Top Magnets',
      ranking: {
        country_code: 'MX',
        period_date: '2026-01-01',
        top_magnets: [],
        top_exodus: [],
        prose_md: null,
      },
    });
    expect(svg).toContain('Sin zonas para rankear');
  });

  it('returns placeholder when alpha counts are all zero', () => {
    const data: ChartData = {
      kind: 'alpha-lifecycle-sankey',
      title: 'Alpha',
      summary: {
        country_code: 'MX',
        period_date: '2026-01-01',
        counts_by_state: {
          emerging: 0,
          alpha: 0,
          peaked: 0,
          matured: 0,
          declining: 0,
        },
        transitions_this_period: [],
        case_studies: [],
      },
    };
    const svg = renderChartSVG(data);
    expect(svg).toContain('Sin zonas alpha');
  });
});

describe('svgToBuffer', () => {
  it('converts svg string to a Buffer round-trip', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const buf = svgToBuffer(svg);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf-8')).toBe(svg);
  });
});
