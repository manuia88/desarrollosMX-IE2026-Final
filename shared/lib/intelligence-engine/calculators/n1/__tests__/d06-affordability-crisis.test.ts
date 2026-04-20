import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import d06, {
  computeD06AffordabilityCrisis,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../d06-affordability-crisis';

describe('D06 Affordability Crisis calculator', () => {
  it('declara version, methodology, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('zone_scores:A01');
    expect(methodology.dependencies.length).toBe(3);
    expect(methodology.triggers_cascade).toContain('macro_updated');
    expect(DEFAULT_WEIGHTS.A01).toBe(0.5);
    expect(
      DEFAULT_WEIGHTS.sobrecosto + DEFAULT_WEIGHTS.salario_gap + DEFAULT_WEIGHTS.A01,
    ).toBeCloseTo(1, 5);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea flags', () => {
    expect(getLabelKey(80, 'high')).toBe('ie.score.d06.zona_en_crisis');
    expect(getLabelKey(50, 'high')).toBe('ie.score.d06.zona_tensionada');
    expect(getLabelKey(20, 'high')).toBe('ie.score.d06.zona_estable');
    expect(getLabelKey(80, 'insufficient_data')).toBe('ie.score.d06.insufficient');
  });

  it('Iztapalapa fixture — salario bajo vs renta elevada → zona_en_crisis', () => {
    // Iztapalapa approx: salario mediano $8,500/mes ($102K/año),
    // renta P50 $7,500/mes → renta anual × 3 = $270K. Ratio = 2.65 → salario_gap_score alto.
    // sobrecosto_vivienda_pct BBVA Iztapalapa ~0.35 (35%).
    // A01 affordability bajo (~20).
    const res = computeD06AffordabilityCrisis({
      A01_affordability: 20,
      sobrecosto_vivienda_pct: 0.35,
      salario_mediano_zona: 8500, // mensual
      renta_p50_zona: 7500,
      precio_m2_zona_p50: 22000,
      confidences: { A01: 'high', sobrecosto: 'high', salario_gap: 'high' },
    });
    // salario_gap: ratio ≈ 2.65 → (2.65 − 1) × 50 + 50 = 132.5 → clamp 100
    // sobrecosto_score = 35
    // accesibilidad = 0.5·20 + 0.3·(100 − 35) + 0.2·(100 − 100) = 10 + 19.5 + 0 = 29.5
    // crisis = 100 − 29.5 = 70.5 → zona_en_crisis
    expect(res.components.crisis_flag).toBe('zona_en_crisis');
    expect(res.value).toBeGreaterThanOrEqual(70);
    expect(res.confidence).toBe('high');
  });

  it('zona estable — salario alto + A01 alto + sobrecosto bajo', () => {
    // Santa Fe / Del Valle approx: salario mediano $45K/mes ($540K/año),
    // renta P50 $18K/mes → renta anual × 3 = $648K. Ratio = 1.2 → salario_gap = 60
    // sobrecosto = 15%, A01 = 75
    const res = computeD06AffordabilityCrisis({
      A01_affordability: 75,
      sobrecosto_vivienda_pct: 0.15,
      salario_mediano_zona: 45000,
      renta_p50_zona: 18000,
      precio_m2_zona_p50: 80000,
      confidences: { A01: 'high', sobrecosto: 'high', salario_gap: 'high' },
    });
    // salario_gap = (1.2 − 1)·50 + 50 = 60
    // sobrecosto_score = 15
    // accesibilidad = 0.5·75 + 0.3·85 + 0.2·40 = 37.5 + 25.5 + 8 = 71
    // crisis = 29 → zona_estable
    expect(res.components.crisis_flag).toBe('zona_estable');
    expect(res.value).toBeLessThan(40);
  });

  it('D9 fallback — A01 missing → renormaliza entre sobrecosto + salario_gap', () => {
    const res = computeD06AffordabilityCrisis({
      A01_affordability: null,
      sobrecosto_vivienda_pct: 0.3,
      salario_mediano_zona: 12000,
      renta_p50_zona: 9000,
      precio_m2_zona_p50: 30000,
      confidences: { sobrecosto: 'high', salario_gap: 'medium' },
    });
    expect(res.components.missing_dimensions).toContain('A01');
    expect(res.components.available_count).toBe(2);
    // weights: sobrecosto 0.3/(0.3+0.2)=0.6; salario_gap 0.4
    expect(res.components.weights_applied['sobrecosto']).toBeCloseTo(0.6, 3);
    expect(res.components.weights_applied['salario_gap']).toBeCloseTo(0.4, 3);
    expect(res.confidence).toBe('medium');
  });

  it('insufficient_data con solo 1 dep', () => {
    const res = computeD06AffordabilityCrisis({
      A01_affordability: 40,
      sobrecosto_vivienda_pct: null,
      salario_mediano_zona: null,
      renta_p50_zona: null,
      precio_m2_zona_p50: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
  });

  it('sobrecosto normalizado — acepta 0..1 y 0..100', () => {
    const a = computeD06AffordabilityCrisis({
      A01_affordability: 50,
      sobrecosto_vivienda_pct: 0.25, // fraccional → 25
      salario_mediano_zona: 20000,
      renta_p50_zona: 10000,
      precio_m2_zona_p50: 40000,
    });
    const b = computeD06AffordabilityCrisis({
      A01_affordability: 50,
      sobrecosto_vivienda_pct: 25, // pct → 25
      salario_mediano_zona: 20000,
      renta_p50_zona: 10000,
      precio_m2_zona_p50: 40000,
    });
    expect(a.components.sobrecosto_score).toBeCloseTo(25, 1);
    expect(b.components.sobrecosto_score).toBeCloseTo(25, 1);
    expect(a.value).toBe(b.value);
  });

  it('crisis_flag tensionada en middle-band', () => {
    const res = computeD06AffordabilityCrisis({
      A01_affordability: 45,
      sobrecosto_vivienda_pct: 0.28,
      salario_mediano_zona: 15000,
      renta_p50_zona: 8000,
      precio_m2_zona_p50: 30000,
      confidences: { A01: 'high', sobrecosto: 'high', salario_gap: 'high' },
    });
    expect(res.components.crisis_flag).toBe('zona_tensionada');
    expect(res.value).toBeGreaterThanOrEqual(40);
    expect(res.value).toBeLessThan(70);
  });

  it('ratio_precio_salario calculado', () => {
    const res = computeD06AffordabilityCrisis({
      A01_affordability: 30,
      sobrecosto_vivienda_pct: 0.3,
      salario_mediano_zona: 20000, // anualizado 240K
      renta_p50_zona: 10000,
      precio_m2_zona_p50: 48000,
    });
    // ratio = 48000 / 240000 = 0.2 (años de salario por m²)
    expect(res.components.ratio_precio_salario).toBeCloseTo(0.2, 2);
  });

  it('d06.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await d06.run(
      { zoneId: 'iztapalapa', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.d06.insufficient');
  });
});
