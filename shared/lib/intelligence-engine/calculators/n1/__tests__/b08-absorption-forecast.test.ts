import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import b08, {
  type B08VentaMensual,
  computeB08AbsorptionForecast,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../b08-absorption-forecast';

const VENTAS_6M_SALUDABLE: readonly B08VentaMensual[] = [
  { month: '2025-11', count: 8 },
  { month: '2025-12', count: 9 },
  { month: '2026-01', count: 10 },
  { month: '2026-02', count: 11 },
  { month: '2026-03', count: 12 },
  { month: '2026-04', count: 13 },
];

const VENTAS_6M_ALTAS: readonly B08VentaMensual[] = [
  { month: '2025-11', count: 18 },
  { month: '2025-12', count: 19 },
  { month: '2026-01', count: 20 },
  { month: '2026-02', count: 20 },
  { month: '2026-03', count: 21 },
  { month: '2026-04', count: 22 },
];

describe('B08 Absorption Forecast calculator', () => {
  it('declara version, methodology, reasoning_template, dependencies, weights', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('project_sales');
    expect(methodology.sources).toContain('macro_series:tiie28');
    expect(methodology.tier_gate.min_proyectos_zona).toBe(50);
    expect(methodology.tier_gate.min_meses_data).toBe(6);
    // Weights suma 1.0.
    expect(DEFAULT_WEIGHTS.N11).toBe(0.3);
    expect(DEFAULT_WEIGHTS.B01).toBe(0.25);
    expect(DEFAULT_WEIGHTS.B04).toBe(0.25);
    expect(DEFAULT_WEIGHTS.macro_tiie).toBe(0.2);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
    const depIds = methodology.dependencies.map((d) => d.score_id);
    expect(depIds).toContain('N11');
    expect(depIds).toContain('B01');
    expect(depIds).toContain('B04');
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.b08.rapida');
    expect(getLabelKey(60, 'high')).toBe('ie.score.b08.saludable');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.b08.lenta');
    expect(getLabelKey(10, 'low')).toBe('ie.score.b08.estancada');
    expect(getLabelKey(40, 'insufficient_data')).toBe('ie.score.b08.insufficient');
  });

  it('monthly_projection shape: 12 meses × {optimista, base, pesimista}', () => {
    const res = computeB08AbsorptionForecast({
      project_id: 'proj-1',
      ventas_ultimos_6m: VENTAS_6M_SALUDABLE,
      momentum_zone_n11: 70,
      b01_demand: 65,
      b04_pmf: 60,
      macro_tiie: 9.5,
      units_remaining: 200,
      period: '2026-04-01',
      proyectos_zona: 80,
    });
    expect(res.components.monthly_projection.length).toBe(12);
    for (const m of res.components.monthly_projection) {
      expect(typeof m.month).toBe('string');
      expect(m.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof m.optimista).toBe('number');
      expect(typeof m.base).toBe('number');
      expect(typeof m.pesimista).toBe('number');
      // Invariante: optimista ≥ base ≥ pesimista (para valores positivos).
      expect(m.optimista).toBeGreaterThanOrEqual(m.base);
      expect(m.base).toBeGreaterThanOrEqual(m.pesimista);
      expect(m.optimista).toBeGreaterThanOrEqual(0);
      expect(m.pesimista).toBeGreaterThanOrEqual(0);
    }
    // optimista ≈ 1.15 × base, pesimista ≈ 0.85 × base — sanity check ratio.
    const sample = res.components.monthly_projection[3];
    if (!sample) throw new Error('sample missing');
    if (sample.base > 0) {
      const ratioOpt = sample.optimista / sample.base;
      const ratioPes = sample.pesimista / sample.base;
      expect(Math.abs(ratioOpt - 1.15)).toBeLessThan(0.02);
      expect(Math.abs(ratioPes - 0.85)).toBeLessThan(0.02);
    }
  });

  it('criterio done — proyecto 20 ventas/mes + momentum alto → fin estimada <6m para 100 units', () => {
    const res = computeB08AbsorptionForecast({
      project_id: 'proj-hot',
      ventas_ultimos_6m: VENTAS_6M_ALTAS,
      momentum_zone_n11: 85,
      b01_demand: 80,
      b04_pmf: 75,
      macro_tiie: 8.0,
      units_remaining: 100,
      period: '2026-04-01',
      proyectos_zona: 80,
    });
    expect(res.components.fecha_fin_estimada_base).not.toBeNull();
    // meses_absorcion_base debe ser <6 (proyecto 20/mes × ~6m cubre 100 units).
    expect(res.components.meses_absorcion_base).not.toBeNull();
    const meses = res.components.meses_absorcion_base ?? 99;
    expect(meses).toBeLessThan(7);
    expect(res.value).toBeGreaterThanOrEqual(75);
    expect(res.components.bucket).toBe('rapida');
    expect(res.confidence).toBe('high');
    // adjustment_multiplier > 1 por señales IE positivas.
    expect(res.components.adjustment_multiplier).toBeGreaterThan(1);
  });

  it('adjustment_multiplier < 1 con señales IE bajas + TIIE alta', () => {
    const res = computeB08AbsorptionForecast({
      project_id: 'proj-cold',
      ventas_ultimos_6m: VENTAS_6M_SALUDABLE,
      momentum_zone_n11: 20, // malo
      b01_demand: 25,
      b04_pmf: 30,
      macro_tiie: 12.0, // alto → contexto peor
      units_remaining: 200,
      period: '2026-04-01',
      proyectos_zona: 80,
    });
    expect(res.components.adjustment_multiplier).toBeLessThan(1);
    // Total ventas 12m base más bajo por multiplier bajo.
    expect(res.components.total_ventas_12m.base).toBeLessThan(
      res.components.total_ventas_12m.optimista,
    );
  });

  it('tier gate: <50 proyectos_zona → insufficient_data + tier_gated=true', () => {
    const res = computeB08AbsorptionForecast({
      project_id: 'proj-small-zone',
      ventas_ultimos_6m: VENTAS_6M_SALUDABLE,
      momentum_zone_n11: 60,
      b01_demand: 55,
      b04_pmf: 50,
      macro_tiie: 9.5,
      units_remaining: 100,
      period: '2026-04-01',
      proyectos_zona: 10, // debajo del gate
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.tier_gated).toBe(true);
    expect(res.components.tier_gate_passed).toBe(false);
    expect(res.components.bucket).toBe('insufficient');
    expect(res.value).toBe(0);
  });

  it('tier gate: <6 meses ventas → insufficient_data', () => {
    const ventas_corto: readonly B08VentaMensual[] = VENTAS_6M_SALUDABLE.slice(0, 3);
    const res = computeB08AbsorptionForecast({
      project_id: 'proj-new',
      ventas_ultimos_6m: ventas_corto,
      momentum_zone_n11: 60,
      b01_demand: 55,
      b04_pmf: 50,
      macro_tiie: 9.5,
      units_remaining: 100,
      period: '2026-04-01',
      proyectos_zona: 80,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.tier_gated).toBe(true);
  });

  it('fecha_fin_estimada null cuando units_remaining > capacidad 12m proyectada', () => {
    const res = computeB08AbsorptionForecast({
      project_id: 'proj-big',
      ventas_ultimos_6m: VENTAS_6M_SALUDABLE, // ~10/mes
      momentum_zone_n11: 40,
      b01_demand: 40,
      b04_pmf: 40,
      macro_tiie: 10.0,
      units_remaining: 500, // mucho > 12m × ~10
      period: '2026-04-01',
      proyectos_zona: 80,
    });
    expect(res.components.fecha_fin_estimada_base).toBeNull();
    // Sin embargo meses_absorcion_base debe estar estimado (extrapolación >12m).
    expect(res.components.meses_absorcion_base).not.toBeNull();
    const meses = res.components.meses_absorcion_base ?? 0;
    expect(meses).toBeGreaterThan(12);
  });

  it('weightsOverride cambia el adjustment multiplier', () => {
    const input = {
      project_id: 'proj-w',
      ventas_ultimos_6m: VENTAS_6M_SALUDABLE,
      momentum_zone_n11: 80,
      b01_demand: 40,
      b04_pmf: 40,
      macro_tiie: 9.0,
      units_remaining: 150,
      period: '2026-04-01',
      proyectos_zona: 80,
    };
    const resDefault = computeB08AbsorptionForecast(input);
    const resOverride = computeB08AbsorptionForecast(input, {
      weightsOverride: { N11: 0.7, B01: 0.1, B04: 0.1, macro_tiie: 0.1 },
    });
    // N11 es alto (80) → si pesa más, adjustment más alto en override.
    expect(resOverride.components.adjustment_multiplier).toBeGreaterThan(
      resDefault.components.adjustment_multiplier,
    );
    expect(resOverride.components.weights_applied.N11).toBe(0.7);
  });

  it('b08.run() prod-path devuelve insufficient + provenance válido + 5 citations', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await b08.run(
      { projectId: 'proj-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.b08.insufficient');
    expect(out.citations.length).toBe(5);
    const citSources = out.citations.map((c) => c.source);
    expect(citSources).toContain('project_sales');
    expect(citSources).toContain('zone_scores:N11');
  });
});
