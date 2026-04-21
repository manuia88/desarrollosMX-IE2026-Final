import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import d03, {
  ALERT_THRESHOLDS,
  CRITICAL_DEPS,
  computeD03SupplyPipeline,
  DEMAND_COVERAGE_FACTOR,
  getLabelKey,
  methodology,
  OVERSUPPLY_MULTIPLIER,
  reasoning_template,
  version,
} from '../d03-supply-pipeline';

describe('D03 Supply Pipeline calculator', () => {
  it('declara version, methodology, reasoning_template, sensitivity_analysis D14', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('projects');
    expect(methodology.sources).toContain('seduvi_permisos');
    expect(methodology.sources).toContain('zone_scores:B01');
    expect(methodology.weights.oversupply_multiplier).toBe(50);
    expect(methodology.weights.demand_coverage_factor).toBe(0.5);
    expect(OVERSUPPLY_MULTIPLIER).toBe(50);
    expect(DEMAND_COVERAGE_FACTOR).toBe(0.5);
    expect(CRITICAL_DEPS).toContain('B01');
    expect(methodology.sensitivity_analysis.length).toBeGreaterThan(0);
    expect(methodology.sensitivity_analysis[0]).toHaveProperty('dimension_id');
    expect(methodology.sensitivity_analysis[0]).toHaveProperty('impact_pct_per_10pct_change');
    expect(reasoning_template).toContain('{pipeline_count}');
    expect(reasoning_template).toContain('{oversupply_ratio}');
    expect(reasoning_template).toContain('{alerta}');
    expect(reasoning_template).toContain('{confidence}');
    expect(ALERT_THRESHOLDS.oversupply_riesgo).toBe(2.0);
    expect(ALERT_THRESHOLDS.undersupply_oportunidad).toBe(0.8);
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.d03.undersupply_oportunidad');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.d03.equilibrado');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.d03.oversupply_moderado');
    expect(getLabelKey(10, 'low')).toBe('ie.score.d03.oversupply_riesgo');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.d03.insufficient');
  });

  it('criterio done FASE 10.A.12 — Santa Fe 50 proyectos pipeline → oversupply_riesgo', () => {
    // Santa Fe: 50 proyectos ≈ 7000 unidades pipeline vs demand_12m 2000 →
    // denom = 2000 · 0.5 = 1000. ratio = 7000/1000 = 7. Score = clamp(100-7·50) = 0.
    const res = computeD03SupplyPipeline({
      pipeline_count: 50,
      pipeline_units: 7000,
      demand_12m: 2000,
    });
    expect(res.components.alerta).toBe('oversupply_riesgo');
    expect(res.components.oversupply_ratio).toBeGreaterThanOrEqual(
      ALERT_THRESHOLDS.oversupply_riesgo,
    );
    expect(res.value).toBeLessThan(25);
  });

  it('equilibrado: pipeline ≈ demand_12m · 0.5 → score medio + alerta equilibrado', () => {
    // pipeline_units = 500, demand_12m = 1000, denom = 500, ratio = 1 → score = 50
    const res = computeD03SupplyPipeline({
      pipeline_count: 5,
      pipeline_units: 500,
      demand_12m: 1000,
    });
    expect(res.components.oversupply_ratio).toBeCloseTo(1, 2);
    expect(res.components.alerta).toBe('equilibrado');
    expect(res.value).toBe(50);
  });

  it('undersupply_oportunidad: ratio < 0.8 → alerta hueco mercado + score alto', () => {
    // pipeline_units = 300, demand_12m = 1000, denom = 500, ratio = 0.6 → score = 70
    const res = computeD03SupplyPipeline({
      pipeline_count: 4,
      pipeline_units: 300,
      demand_12m: 1000,
    });
    expect(res.components.oversupply_ratio).toBeLessThan(ALERT_THRESHOLDS.undersupply_oportunidad);
    expect(res.components.alerta).toBe('undersupply_oportunidad');
    expect(res.value).toBe(70);
  });

  it('oversupply moderado: ratio entre 1.0 y 2.0 → alerta equilibrado pero score bajando', () => {
    // pipeline_units = 750, demand_12m = 1000, denom = 500, ratio = 1.5 → score = 25
    const res = computeD03SupplyPipeline({
      pipeline_count: 8,
      pipeline_units: 750,
      demand_12m: 1000,
    });
    expect(res.components.oversupply_ratio).toBeCloseTo(1.5, 2);
    expect(res.components.alerta).toBe('equilibrado');
    expect(res.value).toBe(25);
  });

  it('SEDUVI estimated_units suma al pipeline total (H2 stub input)', () => {
    const res = computeD03SupplyPipeline({
      pipeline_count: 5,
      pipeline_units: 400,
      seduvi_estimated_units: 200,
      demand_12m: 1000,
    });
    // pipeline total = 400 + 200 = 600, denom = 500, ratio = 1.2 → score = 40
    expect(res.components.pipeline_units).toBe(600);
    expect(res.components.seduvi_estimated_units).toBe(200);
    expect(res.components.oversupply_ratio).toBeCloseTo(1.2, 2);
    expect(res.value).toBe(40);
  });

  it('clamp [0,100] — ratio extremo alto no baja de 0, ratio 0 satura a 100', () => {
    const extremeOversupply = computeD03SupplyPipeline({
      pipeline_count: 100,
      pipeline_units: 50_000,
      demand_12m: 1000,
    });
    expect(extremeOversupply.value).toBe(0);

    const zeroPipeline = computeD03SupplyPipeline({
      pipeline_count: 0,
      pipeline_units: 0,
      demand_12m: 1000,
    });
    expect(zeroPipeline.components.oversupply_ratio).toBe(0);
    expect(zeroPipeline.value).toBe(100);
    expect(zeroPipeline.components.alerta).toBe('undersupply_oportunidad');
  });

  it('critical dep B01 missing (demand_12m null) → insufficient_data', () => {
    const res = computeD03SupplyPipeline({
      pipeline_count: 10,
      pipeline_units: 500,
      demand_12m: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.capped_by).toContain('B01');
    expect(res.components.cap_reason).toBe('critical_dependency_missing');
    expect(res.components.missing_dimensions).toContain('B01_demand_12m');
  });

  it('D13 propagación: B01.confidence=low → D03 cap a medium (no high)', () => {
    const res = computeD03SupplyPipeline({
      pipeline_count: 5,
      pipeline_units: 500,
      demand_12m: 1000,
      deps: [{ scoreId: 'B01', confidence: 'low' }],
    });
    // Coverage 100% normalmente → high, pero B01 crítica low → cap a low/medium.
    expect(['low', 'medium']).toContain(res.confidence);
    expect(res.confidence).not.toBe('high');
  });

  it('D13 propagación: B01.confidence=insufficient_data → D03 = insufficient_data', () => {
    const res = computeD03SupplyPipeline({
      pipeline_count: 5,
      pipeline_units: 500,
      demand_12m: 1000,
      deps: [{ scoreId: 'B01', confidence: 'insufficient_data' }],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('B01');
  });

  it('pipeline muestra pobre (<3 proyectos + sin SEDUVI) → confidence degradado', () => {
    const res = computeD03SupplyPipeline({
      pipeline_count: 1,
      pipeline_units: 100,
      demand_12m: 1000,
    });
    // Coverage 100% pero pipeline_count<3 sin SEDUVI → medium.
    expect(res.confidence).not.toBe('high');
  });

  it('d03.run() prod-path devuelve insufficient sin params + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await d03.run(
      { zoneId: 'santa-fe', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.d03.insufficient');
    expect(out.provenance.calculator_version).toBe(version);
    expect(out.valid_until).toBeTruthy();
  });
});
