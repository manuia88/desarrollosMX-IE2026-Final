import { describe, expect, it } from 'vitest';
import {
  computeF10Gentrification2,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../f10-gentrification-2';

describe('F10 Gentrification 2.0 calculator', () => {
  it('declara version, methodology (dependencies critical + sensitivity_analysis), reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('N03');
    expect(methodology.sources.length).toBeGreaterThanOrEqual(5);
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical).toEqual(['N03']);
    const sumW = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(methodology.validity).toEqual({ unit: 'days', value: 30 });
    expect(methodology.sensitivity_analysis.most_sensitive_input).toBe('N03_velocity');
    expect(methodology.sensitivity_analysis.impact_notes.length).toBeGreaterThan(0);
    expect(reasoning_template).toContain('{fase_gentrificacion}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea 4 fases + insufficient', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.f10.post_gentrificada');
    expect(getLabelKey(65, 'medium')).toBe('ie.score.f10.tardia');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.f10.media');
    expect(getLabelKey(20, 'low')).toBe('ie.score.f10.inicial');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.f10.insufficient');
  });

  it('fase inicial — N03 bajo + precio delta neutro + sin arbitraje', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 20,
      N04_crime_trajectory: 55,
      N01_diversity_delta: 1,
      A04_arbitrage: 30,
      price_index_zona_12m_delta_pct: 0.02,
      confidences: { N03: 'high', N04: 'medium', N01: 'medium', A04: 'medium' },
    });
    expect(result.components.fase_gentrificacion).toBe('inicial');
    expect(result.value).toBeLessThan(30);
  });

  it('fase media — Escandón-like (N03=55, delta precio +12%)', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 55,
      N04_crime_trajectory: 60,
      N01_diversity_delta: 4,
      A04_arbitrage: 55,
      price_index_zona_12m_delta_pct: 0.12,
      confidences: { N03: 'high', N04: 'high', N01: 'medium', A04: 'medium' },
    });
    expect(result.components.fase_gentrificacion).toBe('media');
    expect(result.value).toBeGreaterThanOrEqual(30);
    expect(result.value).toBeLessThan(55);
  });

  it('fase tardia — Roma-like (N03=72, delta precio +18%, arbitraje alto)', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 72,
      N04_crime_trajectory: 65,
      N01_diversity_delta: 6,
      A04_arbitrage: 70,
      price_index_zona_12m_delta_pct: 0.18,
      confidences: { N03: 'high', N04: 'high', N01: 'high', A04: 'high' },
    });
    expect(['tardia', 'post_gentrificada']).toContain(result.components.fase_gentrificacion);
    expect(result.value).toBeGreaterThanOrEqual(55);
  });

  it('fase post_gentrificada — N03 muy alto + precio delta saturado', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 90,
      N04_crime_trajectory: 75,
      N01_diversity_delta: 10,
      A04_arbitrage: 85,
      price_index_zona_12m_delta_pct: 0.25,
      confidences: { N03: 'high', N04: 'high', N01: 'high', A04: 'high' },
    });
    expect(result.components.fase_gentrificacion).toBe('post_gentrificada');
    expect(result.value).toBeGreaterThanOrEqual(75);
  });

  it('critical dep missing (N03 null) → insufficient_data + capped_by=[N03]', () => {
    const result = computeF10Gentrification2({
      N03_velocity: null,
      N04_crime_trajectory: 60,
      N01_diversity_delta: 3,
      A04_arbitrage: 50,
      price_index_zona_12m_delta_pct: 0.1,
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components.fase_gentrificacion).toBe('insufficient');
    expect(result.components.capped_by).toContain('N03');
    expect(result.components.cap_reason).toBe('critical_dependency_missing');
  });

  it('critical dep N03 confidence low → score capped ≤ medium', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 60,
      N04_crime_trajectory: 60,
      N01_diversity_delta: 3,
      A04_arbitrage: 55,
      price_index_zona_12m_delta_pct: 0.12,
      confidences: { N03: 'low', N04: 'high', N01: 'high', A04: 'high' },
    });
    expect(['low', 'medium']).toContain(result.confidence);
    expect(result.confidence).not.toBe('high');
    expect(result.components.capped_by).toContain('N03');
  });

  it('supporting deps missing (A04, price) → renormalize weights + confidence degrade', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 55,
      N04_crime_trajectory: 60,
      N01_diversity_delta: 3,
      A04_arbitrage: null,
      price_index_zona_12m_delta_pct: null,
      confidences: { N03: 'high', N04: 'high', N01: 'high' },
    });
    expect(result.components.missing_dimensions).toEqual(
      expect.arrayContaining(['A04', 'price_delta_12m']),
    );
    expect(result.components.fase_gentrificacion).not.toBe('insufficient');
    const sumW = Object.values(result.components.weights_applied).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 2);
    expect(result.components.coverage_pct).toBe(60);
  });

  it('price_delta_12m satura en 100 (+20% → capped)', () => {
    const result = computeF10Gentrification2({
      N03_velocity: 70,
      N04_crime_trajectory: 70,
      N01_diversity_delta: 8,
      A04_arbitrage: 70,
      price_index_zona_12m_delta_pct: 0.3, // 30% → scale 150 → clamp 100
      confidences: { N03: 'high', N04: 'high', N01: 'high', A04: 'high' },
    });
    expect(result.components.signals.price_signal).toBe(100);
  });

  it('snapshot 4 fases gentrificación', () => {
    const scenarios = {
      inicial: computeF10Gentrification2({
        N03_velocity: 18,
        N04_crime_trajectory: 50,
        N01_diversity_delta: 1,
        A04_arbitrage: 25,
        price_index_zona_12m_delta_pct: 0.01,
        confidences: { N03: 'medium', N04: 'medium', N01: 'medium', A04: 'medium' },
      }),
      media_escandon: computeF10Gentrification2({
        N03_velocity: 55,
        N04_crime_trajectory: 60,
        N01_diversity_delta: 4,
        A04_arbitrage: 55,
        price_index_zona_12m_delta_pct: 0.12,
        confidences: { N03: 'high', N04: 'high', N01: 'medium', A04: 'medium' },
      }),
      tardia_roma: computeF10Gentrification2({
        N03_velocity: 72,
        N04_crime_trajectory: 65,
        N01_diversity_delta: 6,
        A04_arbitrage: 70,
        price_index_zona_12m_delta_pct: 0.18,
        confidences: { N03: 'high', N04: 'high', N01: 'high', A04: 'high' },
      }),
      post_condesa: computeF10Gentrification2({
        N03_velocity: 90,
        N04_crime_trajectory: 75,
        N01_diversity_delta: 10,
        A04_arbitrage: 85,
        price_index_zona_12m_delta_pct: 0.25,
        confidences: { N03: 'high', N04: 'high', N01: 'high', A04: 'high' },
      }),
    };
    const snapshot = Object.fromEntries(
      Object.entries(scenarios).map(([k, v]) => [
        k,
        {
          value: v.value,
          confidence: v.confidence,
          fase: v.components.fase_gentrificacion,
          coverage_pct: v.components.coverage_pct,
          label: getLabelKey(v.value, v.confidence),
        },
      ]),
    );
    expect(snapshot).toMatchSnapshot();
  });
});
