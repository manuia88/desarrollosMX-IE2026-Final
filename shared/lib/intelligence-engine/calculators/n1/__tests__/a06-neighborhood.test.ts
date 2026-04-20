// R1 SAFEGUARD: NO importa computeF08LifeQualityIndex. A06 depende de F08 (N1),
// pero los tests usan F08 como valor fixture pre-computado (number).

import { describe, expect, it } from 'vitest';
import {
  A06_DIMENSIONS,
  type A06ConfidenceMap,
  type A06SubscoreMap,
  computeA06Neighborhood,
  DEFAULT_WEIGHTS,
  getLabelKey,
  methodology,
  PERSONA_WEIGHTS,
  reasoning_template,
  version,
} from '../a06-neighborhood';

// Zona alta (Del Valle-style) — F08 LQI alto.
const ZONA_ALTA_SUBSCORES: A06SubscoreMap = {
  F08: 85,
  H01: 88,
  H02: 82,
  N08: 80,
  N10: 78,
};

// Zona media.
const ZONA_MEDIA_SUBSCORES: A06SubscoreMap = {
  F08: 60,
  H01: 58,
  H02: 60,
  N08: 65,
  N10: 55,
};

// Zona baja.
const ZONA_BAJA_SUBSCORES: A06SubscoreMap = {
  F08: 38,
  H01: 42,
  H02: 40,
  N08: 48,
  N10: 35,
};

// Mixed: N10 faltante + H02 faltante, resto alto.
const ZONA_MIXED_SUBSCORES: A06SubscoreMap = {
  F08: 82,
  H01: 85,
  H02: null,
  N08: 78,
  N10: null,
};

const FULL_CONFIDENCES: A06ConfidenceMap = {
  F08: 'high',
  H01: 'high',
  H02: 'medium',
  N08: 'high',
  N10: 'medium',
};

describe('A06 Neighborhood calculator', () => {
  it('declara version, methodology (con dependencies + persona_adjustments), reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toContain('F08');
    expect(methodology.dependencies.map((d) => d.score_id)).toEqual([
      'F08',
      'H01',
      'H02',
      'N08',
      'N10',
    ]);
    const sum = methodology.dependencies.reduce((acc, d) => acc + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 3);
    expect(methodology.validity).toEqual({ unit: 'days', value: 30 });
    expect(methodology.persona_adjustments).toBeDefined();
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{buyer_persona}');
  });

  it('getLabelKey mapea umbrales excelente/buena/regular/baja', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.a06.excelente');
    expect(getLabelKey(80, 'high')).toBe('ie.score.a06.excelente');
    expect(getLabelKey(70, 'high')).toBe('ie.score.a06.buena');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.a06.regular');
    expect(getLabelKey(20, 'low')).toBe('ie.score.a06.baja');
    expect(getLabelKey(90, 'insufficient_data')).toBe('ie.score.a06.insufficient');
  });

  it('compute con 5 subscores → cobertura 100% + value razonable', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_ALTA_SUBSCORES,
      confidences: FULL_CONFIDENCES,
    });
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(100);
    expect(result.components.available_count).toBe(5);
    expect(result.components.total_count).toBe(5);
    expect(result.components.coverage_pct).toBe(100);
    expect(result.components.missing_dimensions).toEqual([]);
    expect(result.components.buyer_persona).toBe('default');
    expect(Object.keys(result.components.pesos_aplicados).sort()).toEqual(
      [...A06_DIMENSIONS].sort(),
    );
  });

  it('DEFAULT_WEIGHTS suma 1.0 y matches plan (F08=0.30, H01=0.20, H02=0.15, N08=0.20, N10=0.15)', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
    expect(DEFAULT_WEIGHTS.F08 ?? 0).toBeCloseTo(0.3, 3);
    expect(DEFAULT_WEIGHTS.H01 ?? 0).toBeCloseTo(0.2, 3);
    expect(DEFAULT_WEIGHTS.H02 ?? 0).toBeCloseTo(0.15, 3);
    expect(DEFAULT_WEIGHTS.N08 ?? 0).toBeCloseTo(0.2, 3);
    expect(DEFAULT_WEIGHTS.N10 ?? 0).toBeCloseTo(0.15, 3);
  });

  it('persona=family → H01 peso boost ≥0.25 (criterio plan §9.B.3)', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_ALTA_SUBSCORES,
      confidences: FULL_CONFIDENCES,
      buyer_persona: 'family',
    });
    expect(result.components.buyer_persona).toBe('family');
    const h01Peso = result.components.pesos_aplicados.H01 ?? 0;
    const h01Default = DEFAULT_WEIGHTS.H01 ?? 0;
    expect(h01Peso).toBeGreaterThanOrEqual(0.25);
    // Peso H01 > peso default 0.20
    expect(h01Peso).toBeGreaterThan(h01Default);
  });

  it('persona=digital_nomad → H01 peso ≤0.08 y N08 peso ≥0.25 (criterio plan §9.B.3)', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_ALTA_SUBSCORES,
      confidences: FULL_CONFIDENCES,
      buyer_persona: 'digital_nomad',
    });
    expect(result.components.buyer_persona).toBe('digital_nomad');
    const h01Peso = result.components.pesos_aplicados.H01 ?? 0;
    const n08Peso = result.components.pesos_aplicados.N08 ?? 0;
    expect(h01Peso).toBeLessThanOrEqual(0.08);
    expect(n08Peso).toBeGreaterThanOrEqual(0.25);
  });

  it('persona shift — family vs digital_nomad producen values distintos con mismos subscores', () => {
    // Zona con H01 alto + N08 bajo → family debería puntuar mayor que digital_nomad.
    const subscoresH01HighN08Low: A06SubscoreMap = {
      F08: 70,
      H01: 95,
      H02: 70,
      N08: 30,
      N10: 60,
    };
    const resultFamily = computeA06Neighborhood({
      subscores: subscoresH01HighN08Low,
      confidences: FULL_CONFIDENCES,
      buyer_persona: 'family',
    });
    const resultNomad = computeA06Neighborhood({
      subscores: subscoresH01HighN08Low,
      confidences: FULL_CONFIDENCES,
      buyer_persona: 'digital_nomad',
    });
    expect(resultFamily.value).toBeGreaterThan(resultNomad.value);
    // Validar shift real de pesos
    const familyH01 = resultFamily.components.pesos_aplicados.H01 ?? 0;
    const nomadH01 = resultNomad.components.pesos_aplicados.H01 ?? 0;
    const familyN08 = resultFamily.components.pesos_aplicados.N08 ?? 0;
    const nomadN08 = resultNomad.components.pesos_aplicados.N08 ?? 0;
    expect(familyH01).toBeGreaterThan(nomadH01);
    expect(nomadN08).toBeGreaterThan(familyN08);
  });

  it('persona=senior → N10 peso boost ≥0.25', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_ALTA_SUBSCORES,
      confidences: FULL_CONFIDENCES,
      buyer_persona: 'senior',
    });
    const n10Peso = result.components.pesos_aplicados.N10 ?? 0;
    expect(n10Peso).toBeGreaterThanOrEqual(0.25);
  });

  it('cada PERSONA_WEIGHTS suma 1.0', () => {
    for (const [persona, w] of Object.entries(PERSONA_WEIGHTS)) {
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      expect(sum, `persona=${persona}`).toBeCloseTo(1.0, 6);
    }
  });

  it('D9 fallback — 2 deps missing (H02 + N10) → renormaliza + missing_dimensions', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_MIXED_SUBSCORES,
      confidences: {
        F08: 'high',
        H01: 'high',
        N08: 'medium',
      },
    });
    expect(result.components.missing_dimensions).toEqual(expect.arrayContaining(['H02', 'N10']));
    expect(result.components.missing_dimensions).toHaveLength(2);
    expect(result.components.available_count).toBe(3);
    expect(result.components.coverage_pct).toBe(60);
    const pesosSum = Object.values(result.components.pesos_aplicados).reduce((a, b) => a + b, 0);
    expect(pesosSum).toBeCloseTo(1.0, 3);
    expect(result.components.pesos_aplicados.H02).toBeUndefined();
    expect(result.components.pesos_aplicados.N10).toBeUndefined();
  });

  it('D9 cascade — una dep con confidence low hace bajar la cascade', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_ALTA_SUBSCORES,
      confidences: {
        F08: 'high',
        H01: 'high',
        H02: 'high',
        N08: 'high',
        N10: 'low',
      },
    });
    expect(result.confidence).toBe('low');
  });

  it('coverage <50% → insufficient_data + value=0', () => {
    const sparse: A06SubscoreMap = {
      F08: 80,
      H01: 75,
      H02: null,
      N08: null,
      N10: null,
    };
    const result = computeA06Neighborhood({ subscores: sparse });
    expect(result.confidence).toBe('insufficient_data');
    expect(result.value).toBe(0);
    expect(result.components.bucket).toBe('insufficient');
    expect(result.components.coverage_pct).toBeLessThan(50);
    expect(result.components.missing_dimensions).toEqual(
      expect.arrayContaining(['H02', 'N08', 'N10']),
    );
  });

  it('persona desconocida → cae a defaults', () => {
    const result = computeA06Neighborhood({
      subscores: ZONA_ALTA_SUBSCORES,
      confidences: FULL_CONFIDENCES,
      // @ts-expect-error — probar persona inválida usa defaults
      buyer_persona: 'no_existe',
    });
    // Pesos quedan como defaults
    const f08Peso = result.components.pesos_aplicados.F08 ?? 0;
    const f08Default = DEFAULT_WEIGHTS.F08 ?? 0;
    expect(f08Peso).toBeCloseTo(f08Default, 3);
  });

  it('snapshot 4 escenarios — zona alta (default), zona media (family), zona baja (digital_nomad), mixed (senior)', () => {
    const scenarios = {
      alta_default: computeA06Neighborhood({
        subscores: ZONA_ALTA_SUBSCORES,
        confidences: FULL_CONFIDENCES,
      }),
      media_family: computeA06Neighborhood({
        subscores: ZONA_MEDIA_SUBSCORES,
        confidences: FULL_CONFIDENCES,
        buyer_persona: 'family',
      }),
      baja_digital_nomad: computeA06Neighborhood({
        subscores: ZONA_BAJA_SUBSCORES,
        confidences: FULL_CONFIDENCES,
        buyer_persona: 'digital_nomad',
      }),
      mixed_senior: computeA06Neighborhood({
        subscores: ZONA_MIXED_SUBSCORES,
        confidences: {
          F08: 'high',
          H01: 'high',
          N08: 'medium',
        },
        buyer_persona: 'senior',
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
          buyer_persona: v.components.buyer_persona,
          coverage_pct: v.components.coverage_pct,
          missing: v.components.missing_dimensions,
          pesos_aplicados: v.components.pesos_aplicados,
        },
      ]),
    );
    expect(snapshot).toMatchSnapshot();
  });
});
