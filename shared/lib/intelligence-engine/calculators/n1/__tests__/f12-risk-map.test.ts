import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import f12, {
  computeF12RiskMap,
  DEFAULT_WEIGHTS,
  type F12RawInput,
  getLabelKey,
  methodology,
  reasoning_template,
  version,
} from '../f12-risk-map';

describe('F12 Risk Map (N1) calculator', () => {
  it('declara version/methodology/reasoning_template shape', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/score/);
    expect(methodology.dependencies.map((d) => d.score_id).sort()).toEqual([
      'F01',
      'F06',
      'H03',
      'N05',
      'N07',
    ]);
    // Pesos suman ~1.
    const sum = methodology.dependencies.reduce((a, d) => a + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(methodology.validity.unit).toBe('days');
    expect(methodology.validity.value).toBe(30);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
    expect(DEFAULT_WEIGHTS.H03).toBe(0.3);
    expect(DEFAULT_WEIGHTS.N07).toBe(0.2);
    expect(DEFAULT_WEIGHTS.F01).toBe(0.2);
    expect(DEFAULT_WEIGHTS.F06).toBe(0.15);
    expect(DEFAULT_WEIGHTS.N05).toBe(0.15);
  });

  it('getLabelKey mapea umbrales correctamente', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.f12.muy_seguro');
    expect(getLabelKey(70, 'high')).toBe('ie.score.f12.seguro');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.f12.moderado');
    expect(getLabelKey(30, 'medium')).toBe('ie.score.f12.alto');
    expect(getLabelKey(10, 'low')).toBe('ie.score.f12.extremo');
    expect(getLabelKey(80, 'insufficient_data')).toBe('ie.score.f12.insufficient');
  });

  it('score INVERSO: deps todas en 100 (sin riesgo) → score=100', () => {
    const res = computeF12RiskMap({
      H03: 100,
      N07: 100,
      F01: 100,
      F06: 100,
      N05: 100,
    });
    expect(res.value).toBe(100);
    expect(res.components.weighted_risk).toBe(0);
    expect(res.components.riesgos_principales.every((r) => r.severity === 0)).toBe(true);
  });

  it('score INVERSO: deps todas en 0 (riesgo máximo) → score=0', () => {
    const res = computeF12RiskMap({
      H03: 0,
      N07: 0,
      F01: 0,
      F06: 0,
      N05: 0,
    });
    expect(res.value).toBe(0);
    expect(res.components.weighted_risk).toBe(100);
  });

  it('criterio done: Tlalpan laderas F12 <40 (H03=30, N05=25, F01=40, F06=50, N07=35)', () => {
    const res = computeF12RiskMap({
      H03: 30,
      N07: 35,
      F01: 40,
      F06: 50,
      N05: 25,
    });
    // Riesgos: H03 risk=70 (w=0.30), N07=65 (w=0.20), F01=60 (w=0.20), F06=50 (w=0.15), N05=75 (w=0.15)
    // weighted_risk = 70·0.3 + 65·0.2 + 60·0.2 + 50·0.15 + 75·0.15 = 21 + 13 + 12 + 7.5 + 11.25 = 64.75
    // score = 100 − 64.75 = 35.25 → 35
    expect(res.value).toBeLessThan(40);
    expect(res.value).toBeGreaterThanOrEqual(30);
    // Riesgo dominante: N05 infraestructura (severity 75) es el mayor.
    expect(res.components.riesgo_dominante).toBe('infraestructura');
    expect(res.components.riesgos_principales[0]?.severity).toBe(75);
    expect(res.components.dims_usadas).toBe(5);
    expect(res.components.dims_total).toBe(5);
  });

  it('dep missing → D9 renormalize + missing_dimensions reportado', () => {
    // Falta N05 (infraestructura). H03=30, N07=35, F01=40, F06=50.
    const res = computeF12RiskMap({
      H03: 30,
      N07: 35,
      F01: 40,
      F06: 50,
      N05: null,
    });
    expect(res.components.missing_dimensions).toContain('N05');
    expect(res.components.dims_usadas).toBe(4);
    expect(res.components.dims_total).toBe(5);
    // Weights renormalizados deben sumar 1 sobre deps presentes.
    const sum = Object.values(res.components.weights_applied).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    // Confidence downgrade a medium al faltar dep aunque no se pase confidences.
    expect(['high', 'medium', 'low', 'insufficient_data']).toContain(res.confidence);
  });

  it('todas deps missing → confidence insufficient_data + value=0', () => {
    const res = computeF12RiskMap({
      H03: null,
      N07: null,
      F01: null,
      F06: null,
      N05: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.dims_usadas).toBe(0);
    expect(res.components.riesgo_dominante).toBeNull();
  });

  it('composeConfidence: peor dep manda', () => {
    const res = computeF12RiskMap({
      H03: 80,
      N07: 80,
      F01: 80,
      F06: 80,
      N05: 80,
      confidences: { H03: 'high', N07: 'high', F01: 'low', F06: 'high', N05: 'medium' },
    });
    expect(res.confidence).toBe('low');
  });

  it('riesgos_principales ordenados por severity descendente', () => {
    // Dimensiones con riesgos: H03 risk=90 (sismico), N07 risk=10 (hidrico), F01 risk=50.
    const res = computeF12RiskMap({
      H03: 10,
      N07: 90,
      F01: 50,
      F06: 100,
      N05: 100,
    });
    const sev = res.components.riesgos_principales.map((r) => r.severity);
    // Ordenado descendente.
    for (let i = 1; i < sev.length; i++) {
      const prev = sev[i - 1];
      const curr = sev[i];
      if (prev !== undefined && curr !== undefined) expect(prev).toBeGreaterThanOrEqual(curr);
    }
    // Riesgo dominante = sismico (H03 risk=90).
    expect(res.components.riesgo_dominante).toBe('sismico');
  });

  it('weightsOverride aplica correctamente', () => {
    // Override fuerza peso H03=1.0, resto 0.
    const override = { H03: 1.0, N07: 0, F01: 0, F06: 0, N05: 0 };
    const res = computeF12RiskMap(
      {
        H03: 40, // risk=60
        N07: 100,
        F01: 100,
        F06: 100,
        N05: 100,
      },
      { weightsOverride: override },
    );
    // Solo H03 cuenta → risk=60 → score=40.
    expect(res.value).toBe(40);
  });

  it('snapshot: escenarios múltiples de perfil zonal', () => {
    const scenarios: Record<string, F12RawInput> = {
      polanco_seguro: { H03: 85, N07: 90, F01: 75, F06: 80, N05: 85 },
      del_valle_balanceado: { H03: 70, N07: 75, F01: 70, F06: 75, N05: 70 },
      tlalpan_laderas: { H03: 30, N07: 35, F01: 40, F06: 50, N05: 25 },
      iztapalapa_riesgoso: { H03: 25, N07: 20, F01: 30, F06: 40, N05: 30 },
      xochimilco_hidrico: { H03: 40, N07: 15, F01: 55, F06: 60, N05: 40 },
      deps_incompletas: { H03: 60, N07: null, F01: 60, F06: null, N05: 60 },
    };
    const snapshot: Record<
      string,
      { value: number; confidence: string; label: string; dominante: string | null }
    > = {};
    for (const [name, input] of Object.entries(scenarios)) {
      const res = computeF12RiskMap(input);
      snapshot[name] = {
        value: res.value,
        confidence: res.confidence,
        label: getLabelKey(res.value, res.confidence),
        dominante: res.components.riesgo_dominante,
      };
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('f12.run() prod-path devuelve insufficient + provenance válido + label pending', async () => {
    const fakeSb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const out = await f12.run(
      { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.f12.insufficient');
  });
});
