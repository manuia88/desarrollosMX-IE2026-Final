import { describe, expect, it } from 'vitest';
import {
  computeF08LifeQualityIndex,
  DEFAULT_WEIGHTS,
  F08_DIMENSIONS,
  type F08ConfidenceMap,
  type F08SubscoreMap,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../f08-life-quality-index';

// Fixtures "saturados" (Del Valle — zona familiar consolidada).
const DEL_VALLE_SUBSCORES: F08SubscoreMap = {
  F01: 85,
  F02: 82,
  F03: 80,
  H01: 88,
  H02: 85,
  N08: 82,
  N01: 78,
  N04: 80,
  H07: 75,
};

// Fixtures "bajos" (Iztapalapa Sur — zona presión social + ambiente).
const IZTAPALAPA_SUR_SUBSCORES: F08SubscoreMap = {
  F01: 35,
  F02: 45,
  F03: 40,
  H01: 42,
  H02: 38,
  N08: 48,
  N01: 40,
  N04: 32,
  H07: 35,
};

// Fixtures "mixtos" (Iztacalco — media tabla).
const ZONA_MEDIA_SUBSCORES: F08SubscoreMap = {
  F01: 60,
  F02: 58,
  F03: 62,
  H01: 55,
  H02: 60,
  N08: 65,
  N01: 58,
  N04: 55,
  H07: 50,
};

// Escenario mixed: high F01/F02 pero H01/H02 faltantes (zona transito ok, no datos educ/salud).
const MIXED_GAPS_SUBSCORES: F08SubscoreMap = {
  F01: 82,
  F02: 78,
  F03: 70,
  H01: null,
  H02: null,
  N08: 68,
  N01: 72,
  N04: 65,
  H07: 60,
};

const FULL_CONFIDENCES: F08ConfidenceMap = {
  F01: 'high',
  F02: 'high',
  F03: 'medium',
  H01: 'high',
  H02: 'medium',
  N08: 'high',
  N01: 'high',
  N04: 'medium',
  H07: 'low',
};

describe('F08 Life Quality Index calculator', () => {
  it('declara version, methodology (con dependencies), reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('F01');
    expect(methodology.sources.length).toBeGreaterThanOrEqual(9);
    expect(methodology.dependencies.map((d) => d.score_id)).toEqual([
      'F01',
      'F02',
      'F03',
      'H01',
      'H02',
      'N08',
      'N01',
      'N04',
      'H07',
    ]);
    // Weights suman 1.0 (tolerancia flotante).
    const sum = methodology.dependencies.reduce((acc, d) => acc + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 3);
    expect(methodology.validity).toEqual({ unit: 'days', value: 30 });
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea umbrales muy_buena/buena/regular/baja', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.f08.muy_buena');
    expect(getLabelKey(80, 'high')).toBe('ie.score.f08.muy_buena');
    expect(getLabelKey(70, 'high')).toBe('ie.score.f08.buena');
    expect(getLabelKey(60, 'medium')).toBe('ie.score.f08.buena');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.f08.regular');
    expect(getLabelKey(40, 'low')).toBe('ie.score.f08.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.f08.baja');
    expect(getLabelKey(90, 'insufficient_data')).toBe('ie.score.f08.insufficient');
  });

  it('compute con 9 subscores completos → value razonable + cobertura 100%', () => {
    const result = computeF08LifeQualityIndex({
      subscores: DEL_VALLE_SUBSCORES,
      confidences: FULL_CONFIDENCES,
    });
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(100);
    expect(result.components.available_count).toBe(9);
    expect(result.components.total_count).toBe(9);
    expect(result.components.coverage_pct).toBe(100);
    expect(result.components.missing_dimensions).toEqual([]);
    expect(Object.keys(result.components.pesos_aplicados).sort()).toEqual(
      [...F08_DIMENSIONS].sort(),
    );
  });

  it('Del Valle con inputs saturados → LQI ≥80 (criterio done FASE 09 §9.A.1)', () => {
    const result = computeF08LifeQualityIndex({
      subscores: DEL_VALLE_SUBSCORES,
      confidences: FULL_CONFIDENCES,
    });
    expect(result.value).toBeGreaterThanOrEqual(80);
    expect(result.components.bucket).toBe('muy_buena');
    expect(getLabelKey(result.value, result.confidence)).toBe('ie.score.f08.muy_buena');
  });

  it('Iztapalapa Sur con inputs bajos → LQI <45 (criterio done FASE 09 §9.A.1)', () => {
    const result = computeF08LifeQualityIndex({
      subscores: IZTAPALAPA_SUR_SUBSCORES,
      confidences: FULL_CONFIDENCES,
    });
    expect(result.value).toBeLessThan(45);
    expect(['regular', 'baja']).toContain(result.components.bucket);
  });

  it('D9 fallback — 2 deps missing → renormaliza pesos + missing_dimensions', () => {
    const result = computeF08LifeQualityIndex({
      subscores: MIXED_GAPS_SUBSCORES,
      confidences: {
        F01: 'high',
        F02: 'high',
        F03: 'medium',
        N08: 'high',
        N01: 'medium',
        N04: 'low',
        H07: 'low',
      },
    });
    expect(result.components.missing_dimensions).toEqual(expect.arrayContaining(['H01', 'H02']));
    expect(result.components.missing_dimensions).toHaveLength(2);
    expect(result.components.available_count).toBe(7);
    expect(result.components.coverage_pct).toBeCloseTo(78, 0);

    // Pesos renormalizados suman 1.0
    const pesosSum = Object.values(result.components.pesos_aplicados).reduce((a, b) => a + b, 0);
    expect(pesosSum).toBeCloseTo(1.0, 3);
    // H01/H02 no presentes en pesos_aplicados
    expect(result.components.pesos_aplicados.H01).toBeUndefined();
    expect(result.components.pesos_aplicados.H02).toBeUndefined();
    // Confidence cae a medium (cobertura <90%).
    expect(['low', 'medium']).toContain(result.confidence);
  });

  it('D9 cae confidence — low en una dep baja toda la cascade', () => {
    const result = computeF08LifeQualityIndex({
      subscores: DEL_VALLE_SUBSCORES,
      confidences: {
        F01: 'high',
        F02: 'high',
        F03: 'high',
        H01: 'high',
        H02: 'high',
        N08: 'low', // el peor manda
        N01: 'high',
        N04: 'high',
        H07: 'high',
      },
    });
    expect(result.confidence).toBe('low');
  });

  it('coverage <50% (5+ missing) → insufficient_data + value=0', () => {
    const sparseSubscores: F08SubscoreMap = {
      F01: 80,
      F02: 75,
      F03: 70,
      H01: null,
      H02: null,
      N08: null,
      N01: null,
      N04: null,
      H07: null,
    };
    const result = computeF08LifeQualityIndex({ subscores: sparseSubscores });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components.bucket).toBe('insufficient');
    expect(result.components.missing_dimensions.length).toBeGreaterThanOrEqual(5);
    expect(result.components.available_count).toBe(3);
    expect(result.components.coverage_pct).toBeLessThan(50);
    expect(result.components.pesos_aplicados).toEqual({});
  });

  it('weightsOverride runtime (D8) reemplaza DEFAULT_WEIGHTS', () => {
    const custom = {
      F01: 0.5,
      F02: 0.1,
      F03: 0.1,
      H01: 0.05,
      H02: 0.05,
      N08: 0.05,
      N01: 0.05,
      N04: 0.05,
      H07: 0.05,
    };
    const result = computeF08LifeQualityIndex(
      {
        subscores: DEL_VALLE_SUBSCORES,
        confidences: FULL_CONFIDENCES,
      },
      { weightsOverride: custom },
    );
    // F01 ahora pesa 0.5 — valor sube vs DEFAULT si F01=85 > promedio resto.
    expect(result.components.pesos_aplicados.F01).toBeCloseTo(0.5, 3);
  });

  it('DEFAULT_WEIGHTS suma 1.0', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('snapshot 4 escenarios — zona alta, media, baja, mixed', () => {
    const scenarios = {
      del_valle_alta: computeF08LifeQualityIndex({
        subscores: DEL_VALLE_SUBSCORES,
        confidences: FULL_CONFIDENCES,
      }),
      iztacalco_media: computeF08LifeQualityIndex({
        subscores: ZONA_MEDIA_SUBSCORES,
        confidences: FULL_CONFIDENCES,
      }),
      iztapalapa_sur_baja: computeF08LifeQualityIndex({
        subscores: IZTAPALAPA_SUR_SUBSCORES,
        confidences: FULL_CONFIDENCES,
      }),
      mixed_gaps_h01_h02: computeF08LifeQualityIndex({
        subscores: MIXED_GAPS_SUBSCORES,
        confidences: {
          F01: 'high',
          F02: 'high',
          F03: 'medium',
          N08: 'high',
          N01: 'medium',
          N04: 'low',
          H07: 'low',
        },
      }),
    };
    const snapshot = Object.fromEntries(
      Object.entries(scenarios).map(([k, v]) => [
        k,
        {
          value: v.value,
          confidence: v.confidence,
          label: getLabelKey(v.value, v.confidence),
          bucket: v.components.bucket,
          coverage_pct: v.components.coverage_pct,
          missing: v.components.missing_dimensions,
        },
      ]),
    );
    expect(snapshot).toMatchSnapshot();
  });
});
