import { describe, expect, it } from 'vitest';
import {
  computeH16NeighborhoodEvolution,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../h16-neighborhood-evolution';

describe('H16 Neighborhood Evolution calculator', () => {
  it('declara version, methodology (dependencies critical + sensitivity_analysis), reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/score_evolucion/);
    const critical = methodology.dependencies.filter((d) => d.critical).map((d) => d.score_id);
    expect(critical).toEqual(['F10']);
    const sumW = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 3);
    expect(methodology.validity).toEqual({ unit: 'days', value: 60 });
    expect(methodology.sensitivity_analysis.most_sensitive_input).toBe('F10_fase_gentrificacion');
    expect(methodology.sensitivity_analysis.impact_notes.length).toBeGreaterThan(0);
    expect(reasoning_template).toContain('{narrativa_tipo}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea 4 narrativas + insufficient', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.h16.gentrificada_post_2017');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.h16.apreciacion_activa');
    expect(getLabelKey(40, 'medium')).toBe('ie.score.h16.estable');
    expect(getLabelKey(25, 'low')).toBe('ie.score.h16.declive');
    expect(getLabelKey(80, 'insufficient_data')).toBe('ie.score.h16.insufficient');
  });

  it('narrativa gentrificada_post_2017 — F10 fase post + precio 5y alto', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 82,
      F10_fase: 'post_gentrificada',
      N03_velocity: 85,
      N04_crime_trajectory: 70,
      price_index_zona_5y_delta_pct: 0.8,
      confidences: { F10: 'high', N03: 'high', N04: 'high' },
    });
    expect(result.components.narrativa_tipo).toBe('gentrificada_post_2017');
    expect(result.components.fase_gentrificacion).toBe('post_gentrificada');
    expect(result.value).toBeGreaterThanOrEqual(75);
  });

  it('narrativa apreciacion_activa — F10 media/tardia + N03≥55 + delta 5y>20%', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 55,
      F10_fase: 'media',
      N03_velocity: 60,
      N04_crime_trajectory: 55,
      price_index_zona_5y_delta_pct: 0.3,
      confidences: { F10: 'high', N03: 'high', N04: 'medium' },
    });
    expect(result.components.narrativa_tipo).toBe('apreciacion_activa');
    expect(result.components.tendencia_demografia).toBe('estable');
  });

  it('narrativa estable — N03 moderado + precio plano + seguridad ok', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 35,
      F10_fase: 'media',
      N03_velocity: 50,
      N04_crime_trajectory: 60,
      price_index_zona_5y_delta_pct: 0.05,
      confidences: { F10: 'medium', N03: 'medium', N04: 'medium' },
    });
    expect(result.components.narrativa_tipo).toBe('estable');
  });

  it('narrativa declive — N04 bajo + N03 bajo + precio negativo', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 25,
      F10_fase: 'inicial',
      N03_velocity: 25,
      N04_crime_trajectory: 30,
      price_index_zona_5y_delta_pct: -0.05,
      confidences: { F10: 'medium', N03: 'medium', N04: 'medium' },
    });
    expect(result.components.narrativa_tipo).toBe('declive');
    expect(result.components.tendencia_seguridad).toBe('descendente');
  });

  it('critical dep F10 missing → insufficient_data + capped_by=[F10]', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: null,
      F10_fase: null,
      N03_velocity: 60,
      N04_crime_trajectory: 55,
      price_index_zona_5y_delta_pct: 0.2,
    });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components.narrativa_tipo).toBe('insufficient');
    expect(result.components.capped_by).toContain('F10');
    expect(result.components.cap_reason).toBe('critical_dependency_missing');
  });

  it('F10 confidence low → score capped ≤ medium', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 70,
      F10_fase: 'tardia',
      N03_velocity: 70,
      N04_crime_trajectory: 65,
      price_index_zona_5y_delta_pct: 0.35,
      confidences: { F10: 'low', N03: 'high', N04: 'high' },
    });
    expect(['low', 'medium']).toContain(result.confidence);
    expect(result.confidence).not.toBe('high');
    expect(result.components.capped_by).toContain('F10');
  });

  it('supporting N03/N04 missing → renormalize weights + degrade confidence', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 55,
      F10_fase: 'media',
      N03_velocity: null,
      N04_crime_trajectory: null,
      price_index_zona_5y_delta_pct: 0.25,
      confidences: { F10: 'high' },
    });
    expect(result.components.missing_dimensions).toEqual(expect.arrayContaining(['N03', 'N04']));
    expect(result.components.narrativa_tipo).not.toBe('insufficient');
    const sumW = Object.values(result.components.weights_applied).reduce((a, b) => a + b, 0);
    expect(sumW).toBeCloseTo(1.0, 2);
    expect(result.components.coverage_pct).toBe(50);
  });

  it('price_signal_5y satura — +50% → 100', () => {
    const result = computeH16NeighborhoodEvolution({
      F10_score: 70,
      F10_fase: 'tardia',
      N03_velocity: 70,
      N04_crime_trajectory: 65,
      price_index_zona_5y_delta_pct: 0.6,
      confidences: { F10: 'high', N03: 'high', N04: 'high' },
    });
    expect(result.components.price_signal_5y).toBe(100);
  });

  it('snapshot 4 narrativas — Roma/Narvarte/Iztacalco/zona_declive', () => {
    const scenarios = {
      roma_post_gentrificada: computeH16NeighborhoodEvolution({
        F10_score: 82,
        F10_fase: 'post_gentrificada',
        N03_velocity: 85,
        N04_crime_trajectory: 70,
        price_index_zona_5y_delta_pct: 0.8,
        confidences: { F10: 'high', N03: 'high', N04: 'high' },
      }),
      narvarte_apreciacion_activa: computeH16NeighborhoodEvolution({
        F10_score: 55,
        F10_fase: 'media',
        N03_velocity: 60,
        N04_crime_trajectory: 55,
        price_index_zona_5y_delta_pct: 0.3,
        confidences: { F10: 'high', N03: 'high', N04: 'medium' },
      }),
      iztacalco_estable: computeH16NeighborhoodEvolution({
        F10_score: 35,
        F10_fase: 'media',
        N03_velocity: 50,
        N04_crime_trajectory: 60,
        price_index_zona_5y_delta_pct: 0.05,
        confidences: { F10: 'medium', N03: 'medium', N04: 'medium' },
      }),
      zona_declive: computeH16NeighborhoodEvolution({
        F10_score: 25,
        F10_fase: 'inicial',
        N03_velocity: 25,
        N04_crime_trajectory: 30,
        price_index_zona_5y_delta_pct: -0.05,
        confidences: { F10: 'medium', N03: 'medium', N04: 'low' },
      }),
    };
    const snapshot = Object.fromEntries(
      Object.entries(scenarios).map(([k, v]) => [
        k,
        {
          value: v.value,
          confidence: v.confidence,
          narrativa: v.components.narrativa_tipo,
          fase: v.components.fase_gentrificacion,
          label: getLabelKey(v.value, v.confidence),
        },
      ]),
    );
    expect(snapshot).toMatchSnapshot();
  });
});
