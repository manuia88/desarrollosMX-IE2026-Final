import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import b02, {
  computeB02MarginPressure,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../b02-margin-pressure';

describe('B02 Margin Pressure calculator', () => {
  it('declara version, methodology, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('projects');
    expect(methodology.sources).toContain('unidades');
    expect(methodology.sources).toContain('macro_series:inpp_construccion');
    expect(methodology.dependencies[0]?.score_id).toBe('B12');
    expect(methodology.tier).toBe(2);
    expect(methodology.bug_historico.formula_incorrecta).toContain('construccion_m2');
    expect(reasoning_template).toContain('{precio_m2_real}');
    expect(reasoning_template).toContain('{margen_pct_str}');
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.b02.margen_sano');
    expect(getLabelKey(60, 'high')).toBe('ie.score.b02.presion_moderada');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.b02.presion_alta');
    expect(getLabelKey(10, 'medium')).toBe('ie.score.b02.margen_critico');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.b02.insufficient');
  });

  it('margen sano (margen_pct ≥ zona_p50) → score 100', () => {
    // precio_m2_real = 10M / 200 m² = 50,000
    // margen_m2 = 50,000 - 20,000 = 30,000 → margen_pct = 0.60 (60%)
    // zona_p50 = 0.20 → margen > p50 → gap negativo → clamp 0 → score 100.
    const res = computeB02MarginPressure({
      precio_total_unidad: 10_000_000,
      construccion_m2: 120,
      terreno_m2: 60,
      roof_garden_m2: 20,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 20_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(res.components.m2_totales).toBe(200);
    expect(res.components.precio_m2_real).toBeCloseTo(50000, 0);
    expect(res.components.margen_pct).toBeCloseTo(0.6, 2);
    expect(res.value).toBe(100);
    expect(res.components.bucket).toBe('sana');
  });

  it('presión alta (margen_pct << zona_p50) → score bajo', () => {
    // precio_m2_real = 3M / 100 m² = 30,000
    // margen_m2 = 30,000 - 28,000 = 2,000 → margen_pct ≈ 0.067 (6.7%)
    // zona_p50 = 0.20 → gap = (0.20 - 0.067)/0.20 = 0.665 → score ≈ 33.5
    const res = computeB02MarginPressure({
      precio_total_unidad: 3_000_000,
      construccion_m2: 70,
      terreno_m2: 30,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 28_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(res.components.m2_totales).toBe(100);
    expect(res.components.precio_m2_real).toBeCloseTo(30000, 0);
    expect(res.components.margen_pct).toBeGreaterThan(0);
    expect(res.components.margen_pct).toBeLessThan(0.1);
    expect(res.value).toBeLessThan(50);
    expect(res.components.bucket).toMatch(/alta_presion|critica/);
  });

  it('margen negativo (costo > precio) → score 0 / crítico', () => {
    // precio_m2_real = 2M / 100 m² = 20,000
    // costo 25,000 > precio → margen_pct negativo
    const res = computeB02MarginPressure({
      precio_total_unidad: 2_000_000,
      construccion_m2: 70,
      terreno_m2: 30,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 25_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(res.components.margen_pct).toBeLessThan(0);
    expect(res.value).toBe(0);
    expect(res.components.bucket).toBe('critica');
  });

  it('components expone precio_m2_buggy_viejo (defensa eterna)', () => {
    // precio_total_unidad = 5M, construccion_m2 = 100, m2_totales = 170
    // precio_m2_real (correcto) = 5M/170 ≈ 29,411.76
    // precio_m2_buggy_viejo = 5M/100 = 50,000 (cifra inflada histórica)
    const res = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 20,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(res.components.precio_m2_buggy_viejo).toBeCloseTo(50000, 0);
    expect(res.components.precio_m2_real).toBeCloseTo(29411.76, 0);
    // Defensa: los dos campos deben diferir significativamente cuando hay
    // terreno/roof_garden — si son iguales, el cálculo regresó al bug.
    expect(res.components.precio_m2_buggy_viejo).not.toBe(res.components.precio_m2_real);
  });

  it('confidence insufficient cuando inputs faltantes o inválidos', () => {
    const sin_precio = computeB02MarginPressure({
      precio_total_unidad: 0,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(sin_precio.confidence).toBe('insufficient_data');

    const sin_m2 = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 5, // < min_m2_totales 20
      terreno_m2: 5,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(sin_m2.confidence).toBe('insufficient_data');

    const sin_costo = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 0,
      zona_margen_p50_pct: 0.2,
    });
    expect(sin_costo.confidence).toBe('insufficient_data');
  });

  it('sin zona_margen_p50_pct (benchmark ausente) degrada confidence a low', () => {
    const res = computeB02MarginPressure({
      precio_total_unidad: 5_000_000,
      construccion_m2: 100,
      terreno_m2: 50,
      roof_garden_m2: 20,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 15_000,
      zona_margen_p50_pct: 0, // sin benchmark
    });
    expect(res.confidence).toBe('low');
    expect(res.components.zona_margen_p50_pct).toBe(0);
  });

  it('balcón + roof_garden incluidos en m2_totales', () => {
    const res = computeB02MarginPressure({
      precio_total_unidad: 4_000_000,
      construccion_m2: 80,
      terreno_m2: 40,
      roof_garden_m2: 30,
      balcon_m2: 10,
      costo_construccion_m2_inpp: 18_000,
      zona_margen_p50_pct: 0.2,
    });
    expect(res.components.m2_totales).toBe(160);
    expect(res.components.precio_m2_real).toBeCloseTo(25000, 0);
  });

  it('presion_inpp_12m expuesto correctamente', () => {
    const res = computeB02MarginPressure({
      precio_total_unidad: 3_000_000,
      construccion_m2: 70,
      terreno_m2: 30,
      roof_garden_m2: 0,
      balcon_m2: 0,
      costo_construccion_m2_inpp: 28_000,
      zona_margen_p50_pct: 0.2,
    });
    // Presión + score deben sumar ~100 (complementarios).
    expect(res.components.presion_inpp_12m + res.value).toBeGreaterThanOrEqual(99);
    expect(res.components.presion_inpp_12m + res.value).toBeLessThanOrEqual(101);
  });

  it('b02.run() sin projectId devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await b02.run({ countryCode: 'MX', periodDate: '2026-04-01' }, fakeSb);
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.b02.insufficient');
    expect(out.components.reason).toContain('projectId');
  });

  it('b02.run() prod-path con projectId devuelve insufficient hasta data pipeline conectado', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await b02.run(
      { projectId: 'proj-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.provenance.calculator_version).toBe(version);
  });
});
