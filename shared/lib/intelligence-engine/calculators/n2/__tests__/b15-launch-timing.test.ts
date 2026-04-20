import { describe, expect, it } from 'vitest';
import {
  CRITICAL_DEPS,
  computeB15LaunchTiming,
  getLabelKey,
  MONTH_NAMES,
  methodology,
  version,
  WEIGHTS,
} from '../b15-launch-timing';

function twelve(fill: number): number[] {
  return Array(12).fill(fill);
}

describe('B15 Launch Timing', () => {
  it('declara methodology + sensitivity_analysis + critical deps', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('zone_scores:D03');
    expect(methodology.sources).toContain('project_scores:B05');
    expect(methodology.sensitivity_analysis.length).toBe(4);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toContain('D03');
    expect(CRITICAL_DEPS).toEqual(expect.arrayContaining(['D03', 'B05']));
    expect(WEIGHTS.search_trends + WEIGHTS.macro_cycle + WEIGHTS.competencia_gap).toBeCloseTo(1, 5);
    expect(MONTH_NAMES.length).toBe(12);
  });

  it('happy path: search peak mes 4 (abril) + macro estable + competencia baja → ventana abril', () => {
    const search = twelve(50);
    search[3] = 95; // abril pico
    const res = computeB15LaunchTiming({
      projectId: 'p-1',
      search_trends_mensuales: search,
      macro_factor_mensual: twelve(70),
      competencia_density_mensual: twelve(30),
    });
    expect(res.components.ventana_recomendada.mes).toBe(4);
    expect(res.components.ventana_recomendada.mes_nombre).toBe('abril');
    expect(res.value).toBeGreaterThan(0);
  });

  it('evita diciembre-enero si search_trends bajos esos meses', () => {
    const search = twelve(70);
    search[0] = 15; // enero bajo
    search[11] = 15; // diciembre bajo
    const res = computeB15LaunchTiming({
      projectId: 'p-2',
      search_trends_mensuales: search,
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(40),
    });
    const evitarMeses = res.components.evitar.map((e) => e.mes_nombre);
    expect(evitarMeses).toContain('enero');
    expect(evitarMeses).toContain('diciembre');
  });

  it('boundary: todos meses iguales → picks mes 1 (first tie)', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-3',
      search_trends_mensuales: twelve(50),
      macro_factor_mensual: twelve(50),
      competencia_density_mensual: twelve(50),
    });
    expect(res.components.ventana_recomendada.mes).toBe(1);
    expect(res.components.scores_mensuales).toHaveLength(12);
  });

  it('scores_mensuales usa fórmula con pesos correctos', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-4',
      search_trends_mensuales: twelve(100),
      macro_factor_mensual: twelve(100),
      competencia_density_mensual: twelve(0),
    });
    // max score teórico: 100·0.4 + 100·0.35 + 100·0.25 = 100
    for (const s of res.components.scores_mensuales) {
      expect(s).toBe(100);
    }
  });

  it('insufficient_data si algún array mensual no es longitud 12', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-5',
      search_trends_mensuales: Array(6).fill(50),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(40),
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.missing_dimensions).toContain('search_trends_mensuales_12');
  });

  it('D13: D03 insufficient → propaga insufficient_data', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-6',
      search_trends_mensuales: twelve(70),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(40),
      deps: [
        { scoreId: 'D03', confidence: 'insufficient_data' },
        { scoreId: 'B05', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('D03');
  });

  it('D13: B05 low caps composite', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-7',
      search_trends_mensuales: twelve(70),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(40),
      deps: [
        { scoreId: 'D03', confidence: 'high' },
        { scoreId: 'B05', confidence: 'low' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(res.components.capped_by).toContain('B05');
  });

  it('D13: todas deps high → confidence high', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-8',
      search_trends_mensuales: twelve(70),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(40),
      deps: [
        { scoreId: 'D03', confidence: 'high' },
        { scoreId: 'B05', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('high');
  });

  it('competencia alta penaliza score (1-density) ∙ 0.25', () => {
    const lowComp = computeB15LaunchTiming({
      projectId: 'p-9',
      search_trends_mensuales: twelve(70),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(10),
    });
    const highComp = computeB15LaunchTiming({
      projectId: 'p-10',
      search_trends_mensuales: twelve(70),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(90),
    });
    expect(lowComp.value).toBeGreaterThan(highComp.value);
  });

  it('rationale incluye mes_nombre + cifras de referencia', () => {
    const search = twelve(40);
    search[6] = 85;
    const res = computeB15LaunchTiming({
      projectId: 'p-11',
      search_trends_mensuales: search,
      macro_factor_mensual: twelve(70),
      competencia_density_mensual: twelve(30),
    });
    expect(res.components.rationale).toMatch(/julio/);
    expect(res.components.ventana_recomendada.mes_nombre).toBe('julio');
  });

  it('ventana_recomendada.semana default=1 (configurable en futura versión)', () => {
    const res = computeB15LaunchTiming({
      projectId: 'p-12',
      search_trends_mensuales: twelve(60),
      macro_factor_mensual: twelve(60),
      competencia_density_mensual: twelve(30),
    });
    expect(res.components.ventana_recomendada.semana).toBe(1);
  });

  it('getLabelKey B15 mapea umbrales', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.b15.ventana_optima');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.b15.ventana_aceptable');
    expect(getLabelKey(30, 'low')).toBe('ie.score.b15.ventana_subóptima');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b15.insufficient');
  });
});
