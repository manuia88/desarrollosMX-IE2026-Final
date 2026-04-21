import { describe, expect, it } from 'vitest';
import {
  CRITICAL_DEPS,
  computeF09Value,
  getLabelKey,
  methodology,
  version,
  WEIGHTS,
} from '../f09-value';

describe('F09 Value Score', () => {
  it('declara methodology structure + sensitivity_analysis + deps', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/F08_LQI/);
    expect(methodology.sources).toContain('zone_scores:F08');
    expect(methodology.sources).toContain('project_scores:A12');
    expect(methodology.sources).toContain('zone_scores:N11');
    expect(methodology.weights.lqi).toBe(0.3);
    expect(methodology.weights.percentil_precio).toBe(0.4);
    expect(methodology.weights.momentum).toBe(0.3);
    expect(WEIGHTS.lqi + WEIGHTS.percentil_precio + WEIGHTS.momentum).toBeCloseTo(1, 5);
    expect(methodology.sensitivity_analysis).toHaveLength(3);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toEqual([
      'F08',
      'A12',
      'N11',
    ]);
    expect(methodology.dependencies.find((d) => d.score_id === 'A12')?.critical).toBe(true);
    expect(CRITICAL_DEPS).toContain('A12');
  });

  it('happy path Del Valle: LQI=82 + percentil 50 + momentum=78 → value ≈74 "buena"', () => {
    const res = computeF09Value({ lqi: 82, percentil_precio_m2: 50, momentum: 78 });
    // 82·0.3 + (100-50)·0.4 + 78·0.3 = 24.6 + 20 + 23.4 = 68 → "buena"
    expect(res.value).toBe(68);
    expect(res.components.oportunidad_valor).toBe('buena');
    expect(res.components.percentil_invertido).toBe(50);
  });

  it('excelente: precio bajo (p10) + LQI alto + momentum alto → ≥80', () => {
    const res = computeF09Value({ lqi: 90, percentil_precio_m2: 10, momentum: 85 });
    // 90·0.3 + 90·0.4 + 85·0.3 = 27 + 36 + 25.5 = 88.5 → 89
    expect(res.value).toBeGreaterThanOrEqual(80);
    expect(res.components.oportunidad_valor).toBe('excelente');
  });

  it('sobreprecio: precio caro (p95) + LQI bajo + momentum bajo → <40', () => {
    const res = computeF09Value({ lqi: 30, percentil_precio_m2: 95, momentum: 25 });
    // 30·0.3 + 5·0.4 + 25·0.3 = 9 + 2 + 7.5 = 18.5 → 19
    expect(res.value).toBeLessThan(40);
    expect(res.components.oportunidad_valor).toBe('sobreprecio');
  });

  it('boundary: value exactamente 80 → excelente', () => {
    const res = computeF09Value({ lqi: 80, percentil_precio_m2: 20, momentum: 80 });
    // 80·0.3 + 80·0.4 + 80·0.3 = 80
    expect(res.value).toBe(80);
    expect(res.components.oportunidad_valor).toBe('excelente');
  });

  it('boundary: percentil=50 invertido=50 (neutro)', () => {
    const res = computeF09Value({ lqi: 60, percentil_precio_m2: 50, momentum: 60 });
    expect(res.components.percentil_invertido).toBe(50);
    // 60·0.3 + 50·0.4 + 60·0.3 = 18 + 20 + 18 = 56 → "regular"
    expect(res.value).toBe(56);
    expect(res.components.oportunidad_valor).toBe('regular');
  });

  it('A12 missing → insufficient_data + critical_dependency_missing', () => {
    const res = computeF09Value({ lqi: 80, percentil_precio_m2: null, momentum: 70 });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.capped_by).toContain('A12');
    expect(res.components.cap_reason).toBe('critical_dependency_missing');
    expect(res.components.missing_dimensions).toContain('A12_percentil_precio');
  });

  it('coverage 33% (solo A12 disponible) → insufficient_data', () => {
    const res = computeF09Value({ lqi: null, percentil_precio_m2: 40, momentum: null });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.coverage_pct).toBe(33);
  });

  it('D13: A12 low-confidence caps composite a medium máx', () => {
    const res = computeF09Value({
      lqi: 80,
      percentil_precio_m2: 30,
      momentum: 75,
      deps: [
        { scoreId: 'F08', confidence: 'high' },
        { scoreId: 'A12', confidence: 'low' },
        { scoreId: 'N11', confidence: 'high' },
      ],
    });
    expect(res.confidence).not.toBe('high');
    expect(['low', 'medium']).toContain(res.confidence);
    expect(res.components.capped_by).toContain('A12');
  });

  it('D13: A12 insufficient dep → propaga insufficient_data', () => {
    const res = computeF09Value({
      lqi: 80,
      percentil_precio_m2: 30,
      momentum: 75,
      deps: [
        { scoreId: 'F08', confidence: 'high' },
        { scoreId: 'A12', confidence: 'insufficient_data' },
        { scoreId: 'N11', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('A12');
  });

  it('D13: todas deps high + coverage 100% → confidence high', () => {
    const res = computeF09Value({
      lqi: 80,
      percentil_precio_m2: 30,
      momentum: 75,
      deps: [
        { scoreId: 'F08', confidence: 'high' },
        { scoreId: 'A12', confidence: 'high' },
        { scoreId: 'N11', confidence: 'high' },
      ],
    });
    expect(res.confidence).toBe('high');
    expect(res.components.coverage_pct).toBe(100);
  });

  it('getLabelKey F09 mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.f09.excelente');
    expect(getLabelKey(70, 'medium')).toBe('ie.score.f09.buena');
    expect(getLabelKey(45, 'low')).toBe('ie.score.f09.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.f09.sobreprecio');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.f09.insufficient');
  });
});
