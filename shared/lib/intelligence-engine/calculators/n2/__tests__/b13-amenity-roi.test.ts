import { describe, expect, it } from 'vitest';
import type { B13AmenidadInput } from '../b13-amenity-roi';
import {
  CRITICAL_DEPS,
  computeB13AmenityRoi,
  getLabelKey,
  methodology,
  ROI_THRESHOLDS,
  version,
} from '../b13-amenity-roi';

function makeAmen(
  nombre: string,
  costo_inicial: number,
  mantenimiento: number,
  lift_m2: number,
  m2: number,
  saturacion = 0,
): B13AmenidadInput {
  return {
    nombre,
    costo_inicial_mxn: costo_inicial,
    costo_mantenimiento_anual_mxn: mantenimiento,
    precio_m2_lift_mxn: lift_m2,
    m2_total_proyecto: m2,
    saturacion_zona_pct: saturacion,
  };
}

describe('B13 Amenity ROI', () => {
  it('declara methodology + sensitivity_analysis + CRITICAL_DEPS B07', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('amenidades_proyecto');
    expect(methodology.sources).toContain('project_scores:B07');
    expect(methodology.sensitivity_analysis.length).toBe(4);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toContain('B07');
    expect(CRITICAL_DEPS).toContain('B07');
    expect(ROI_THRESHOLDS.invertir_min).toBe(2.0);
    expect(ROI_THRESHOLDS.evaluar_min).toBe(1.0);
    expect(ROI_THRESHOLDS.maintenance_years).toBe(10);
  });

  it('roof garden high ROI → recomendacion invertir', () => {
    // costo 5M + 0.3M·10 = 8M. lift 2k·5000m2 = 10M. ROI = 1.25 ... ajustamos: lift 3500·5000=17.5M → 2.19.
    const res = computeB13AmenityRoi({
      projectId: 'p-1',
      amenidades: [makeAmen('roof_garden', 5_000_000, 300_000, 3_500, 5_000)],
    });
    const a = res.components.amenidades[0];
    expect(a).toBeDefined();
    if (!a) return;
    expect(a.roi).toBeGreaterThan(ROI_THRESHOLDS.invertir_min);
    expect(a.recomendacion).toBe('invertir');
  });

  it('gym indoor en zona saturada (80%) → ROI bajo, descartar', () => {
    // lift 2000·3000 = 6M, saturación 80% → 1.2M. costo 3M + 0.2·10=5M → ROI 0.24.
    const res = computeB13AmenityRoi({
      projectId: 'p-2',
      amenidades: [makeAmen('gym_indoor', 3_000_000, 200_000, 2_000, 3_000, 80)],
    });
    const a = res.components.amenidades[0];
    expect(a).toBeDefined();
    if (!a) return;
    expect(a.roi).toBeLessThan(ROI_THRESHOLDS.evaluar_min);
    expect(a.recomendacion).toBe('descartar');
  });

  it('ROI medio [1.0, 2.0) → evaluar', () => {
    // lift 1500·4000=6M. costo 3M + 0.2·10=5M → ROI 1.2 → evaluar.
    const res = computeB13AmenityRoi({
      projectId: 'p-3',
      amenidades: [makeAmen('alberca', 3_000_000, 200_000, 1_500, 4_000)],
    });
    const a = res.components.amenidades[0];
    expect(a).toBeDefined();
    if (!a) return;
    expect(a.roi).toBeGreaterThanOrEqual(ROI_THRESHOLDS.evaluar_min);
    expect(a.roi).toBeLessThan(ROI_THRESHOLDS.invertir_min);
    expect(a.recomendacion).toBe('evaluar');
  });

  it('boundary ROI=2.0 → invertir (inclusive)', () => {
    // costo 10M fijo. revenue_lift = 20M → ROI exactly 2.0.
    const res = computeB13AmenityRoi({
      projectId: 'p-4',
      amenidades: [makeAmen('exacto', 10_000_000, 0, 2_000, 10_000)],
    });
    expect(res.components.amenidades[0]?.roi).toBe(2);
    expect(res.components.amenidades[0]?.recomendacion).toBe('invertir');
  });

  it('boundary ROI=1.0 → evaluar (inclusive)', () => {
    const res = computeB13AmenityRoi({
      projectId: 'p-5',
      amenidades: [makeAmen('exacto', 10_000_000, 0, 1_000, 10_000)],
    });
    expect(res.components.amenidades[0]?.roi).toBe(1);
    expect(res.components.amenidades[0]?.recomendacion).toBe('evaluar');
  });

  it('mix amenidades: 3 invertir + 2 evaluar + 1 descartar', () => {
    const res = computeB13AmenityRoi({
      projectId: 'p-6',
      amenidades: [
        makeAmen('a1', 1_000_000, 0, 5_000, 1_000), // roi 5.0
        makeAmen('a2', 1_000_000, 0, 4_000, 1_000), // roi 4.0
        makeAmen('a3', 1_000_000, 0, 3_000, 1_000), // roi 3.0
        makeAmen('a4', 1_000_000, 0, 1_500, 1_000), // roi 1.5
        makeAmen('a5', 1_000_000, 0, 1_200, 1_000), // roi 1.2
        makeAmen('a6', 1_000_000, 0, 500, 1_000), // roi 0.5
      ],
    });
    expect(res.components.invertir_count).toBe(3);
    expect(res.components.evaluar_count).toBe(2);
    expect(res.components.descartar_count).toBe(1);
    expect(res.components.top_amenidad).toBe('a1');
  });

  it('insufficient_data si no hay amenidades', () => {
    const res = computeB13AmenityRoi({ projectId: 'p-0', amenidades: [] });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.cap_reason).toBe('no_amenidades');
  });

  it('D13: B07 insufficient → propaga insufficient_data', () => {
    const res = computeB13AmenityRoi({
      projectId: 'p-7',
      amenidades: [makeAmen('roof', 5_000_000, 300_000, 3_000, 5_000)],
      deps: [{ scoreId: 'B07', confidence: 'insufficient_data' }],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('B07');
  });

  it('D13: B07 low caps composite', () => {
    const res = computeB13AmenityRoi({
      projectId: 'p-8',
      amenidades: Array.from({ length: 6 }, (_, i) =>
        makeAmen(`a${i}`, 1_000_000, 50_000, 3_000, 2_000),
      ),
      deps: [{ scoreId: 'B07', confidence: 'low' }],
    });
    expect(res.confidence).not.toBe('high');
    expect(res.components.capped_by).toContain('B07');
  });

  it('saturacion_zona reduce revenue_lift proporcionalmente', () => {
    const sinSat = computeB13AmenityRoi({
      projectId: 'p-9',
      amenidades: [makeAmen('a', 1_000_000, 0, 2_000, 5_000, 0)],
    });
    const conSat = computeB13AmenityRoi({
      projectId: 'p-10',
      amenidades: [makeAmen('a', 1_000_000, 0, 2_000, 5_000, 50)],
    });
    const roiSin = sinSat.components.amenidades[0]?.roi ?? 0;
    const roiCon = conSat.components.amenidades[0]?.roi ?? 0;
    expect(roiCon).toBeLessThan(roiSin);
    expect(roiCon).toBeCloseTo(roiSin * 0.5, 1);
  });

  it('getLabelKey B13 mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.b13.amenity_mix_excelente');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.b13.amenity_mix_regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.b13.amenity_mix_pobre');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b13.insufficient');
  });
});
