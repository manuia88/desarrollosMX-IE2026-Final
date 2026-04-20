import { describe, expect, it } from 'vitest';
import { computeA11Patrimonio, getLabelKey, methodology, version } from '../a11-patrimonio-20y';

describe('A11 Patrimonio 20y', () => {
  it('methodology + 20y horizon', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('macro_series:inflacion');
  });

  it('D29 scenarios boom/stagnation/recession', () => {
    const res = computeA11Patrimonio({
      precio_inicial_mxn: 3_000_000,
      tasa_apreciacion_base: 0.05,
      momentum_score: 60,
      tco_mensual_mxn: 5000,
      inflacion_base: 0.04,
    });
    expect(Object.keys(res.scenarios)).toEqual(['boom', 'stagnation', 'recession']);
    expect(res.scenarios.boom?.value).toBeGreaterThan(res.scenarios.recession?.value ?? 0);
  });

  it('Criterio done plan: $3M + apreciación 5% → patrimonio nominal >$6M', () => {
    const res = computeA11Patrimonio({
      precio_inicial_mxn: 3_000_000,
      tasa_apreciacion_base: 0.045,
      momentum_score: 55,
      tco_mensual_mxn: 4000,
      inflacion_base: 0.04,
    });
    // (1+0.045+0.00025)^20 ≈ 2.42 → 7.26M
    expect(res.components.patrimonio_nominal_mxn).toBeGreaterThan(6_000_000);
  });

  it('Inflación alta reduce patrimonio real vs nominal', () => {
    const res = computeA11Patrimonio({
      precio_inicial_mxn: 3_000_000,
      tasa_apreciacion_base: 0.05,
      momentum_score: 50,
      tco_mensual_mxn: 3000,
      inflacion_base: 0.06,
    });
    expect(res.components.patrimonio_real_mxn).toBeLessThan(res.components.patrimonio_nominal_mxn);
  });

  it('A02 missing → insufficient_data', () => {
    const res = computeA11Patrimonio({
      precio_inicial_mxn: 3_000_000,
      tasa_apreciacion_base: null,
      momentum_score: 60,
      tco_mensual_mxn: 5000,
      inflacion_base: 0.04,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.scenarios).toEqual({});
  });

  it('Boom scenario: delta_rate +2pp aumenta real > stagnation', () => {
    const res = computeA11Patrimonio({
      precio_inicial_mxn: 3_000_000,
      tasa_apreciacion_base: 0.04,
      momentum_score: 50,
      tco_mensual_mxn: 4000,
      inflacion_base: 0.04,
    });
    expect(res.scenarios.boom?.value).toBeGreaterThanOrEqual(res.scenarios.stagnation?.value ?? 0);
  });

  it('getLabelKey buckets', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.a11.crecimiento_alto');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.a11.crecimiento_medio');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.a11.crecimiento_bajo');
    expect(getLabelKey(10, 'low')).toBe('ie.score.a11.sin_crecimiento');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.a11.insufficient');
  });
});
