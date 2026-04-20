import { describe, expect, it } from 'vitest';
import { estimateErrorSchema, estimateRequestSchema, estimateResponseSchema } from '../avm';

const VALID_REQUEST = {
  lat: 19.3854,
  lng: -99.1683,
  sup_m2: 120,
  recamaras: 3,
  banos: 2,
  amenidades: ['alberca', 'gimnasio'],
  estado_conservacion: 'excelente' as const,
  tipo_propiedad: 'depto' as const,
  medio_banos: 1,
  estacionamientos: 2,
  edad_anos: 8,
  piso: 5,
  condiciones: {
    roof_garden: true,
    orientacion: 'S' as const,
    seguridad_interna: true,
  },
};

const VALID_RESPONSE = {
  estimate: 7500000,
  ci_low: 5850000,
  ci_high: 9150000,
  confidence_score: 56,
  mae_estimated_pct: 22,
  estimate_alternative: 7200000,
  spread_pct: 4.2,
  flag_uncertain: false,
  flag_corroborated: true,
  score_label_key: 'ie.avm.label.estimate_corroborated',
  adjustments: [
    {
      feature: 'sup_construida_m2',
      value_pct: 8.5,
      source: 'regression_coefficient' as const,
      weight: 1100000,
      confidence: 'high' as const,
      explanation_i18n_key: 'ie.avm.adjustment.sup_construida_m2',
    },
  ],
  comparables: [
    {
      id: 'c1',
      distance_m: 420,
      similarity_score: 0.91,
      price_m2: 62000,
    },
  ],
  market_context: {
    precio_m2_zona_p50: 65000,
    absorcion_12m: 42,
    momentum_n11: 58,
    last_data_update: '2026-04-20',
  },
  methodology: {
    formula: 'estimate = intercept + Σ wi·xi_z',
    sources: ['coefficients-h1', 'comparables'],
    weights: { sup_construida_m2: 1100000 },
    references: [{ name: '03.8 §I01', url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md' }],
    validity: { unit: 'hours' as const, value: 24 },
  },
  model_version: '1.0.0-h1',
  endpoint_version: '1.0.0',
  valid_until: '2026-04-21T00:00:00.000Z',
  cached: false,
  computed_at: '2026-04-20T00:00:00.000Z',
  citations: [{ source: 'coefficients-h1', accessed_at: '2026-04-20' }],
};

describe('AVM schemas Zod', () => {
  it('estimateRequestSchema acepta request válido', () => {
    const parsed = estimateRequestSchema.safeParse(VALID_REQUEST);
    expect(parsed.success).toBe(true);
  });

  it('estimateRequestSchema rechaza lat inválida', () => {
    const parsed = estimateRequestSchema.safeParse({
      ...VALID_REQUEST,
      lat: 200,
    });
    expect(parsed.success).toBe(false);
  });

  it('estimateRequestSchema rechaza sup_m2 negativo', () => {
    const parsed = estimateRequestSchema.safeParse({
      ...VALID_REQUEST,
      sup_m2: -10,
    });
    expect(parsed.success).toBe(false);
  });

  it('estimateRequestSchema rechaza tipo_propiedad fuera enum', () => {
    const parsed = estimateRequestSchema.safeParse({
      ...VALID_REQUEST,
      tipo_propiedad: 'loft',
    });
    expect(parsed.success).toBe(false);
  });

  it('estimateRequestSchema rechaza amenidades no string', () => {
    const parsed = estimateRequestSchema.safeParse({
      ...VALID_REQUEST,
      amenidades: [1, 2, 3],
    });
    expect(parsed.success).toBe(false);
  });

  it('estimateResponseSchema acepta response válido completo', () => {
    const parsed = estimateResponseSchema.safeParse(VALID_RESPONSE);
    expect(parsed.success).toBe(true);
  });

  it('estimateResponseSchema rechaza confidence_score >100', () => {
    const parsed = estimateResponseSchema.safeParse({
      ...VALID_RESPONSE,
      confidence_score: 150,
    });
    expect(parsed.success).toBe(false);
  });

  it('estimateResponseSchema rechaza adjustment source inválido', () => {
    const parsed = estimateResponseSchema.safeParse({
      ...VALID_RESPONSE,
      adjustments: [{ ...VALID_RESPONSE.adjustments[0], source: 'hardcoded' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('estimateErrorSchema acepta error válido', () => {
    const parsed = estimateErrorSchema.safeParse({
      ok: false,
      error: 'invalid_payload',
    });
    expect(parsed.success).toBe(true);
  });

  it('estimateResponseSchema acepta estimate_alternative null', () => {
    const parsed = estimateResponseSchema.safeParse({
      ...VALID_RESPONSE,
      estimate_alternative: null,
      spread_pct: null,
    });
    expect(parsed.success).toBe(true);
  });
});
