// AVM MVP I01 — D5 adjustments auditables.
// Ref: FASE_08 §BLOQUE 8.D.3 step 9.
//
// Cada adjustment ∈ response.adjustments lleva:
//   feature, value_pct (contribución % sobre intercept), source, weight,
//   confidence, explanation_i18n_key.
//
// source:
//   regression_coefficient — derivado del modelo lineal (wi × xi_z).
//   comparable_overlay     — sobre-ajuste vs median comparables.
//   market_context         — momentum N11, absorcion, etc.
//
// confidence:
//   high    — source live data + freshness <30d + weight sustancial.
//   medium  — source con missing parcial o weight moderado.
//   low     — stub data o peso marginal.

import coefficients from './coefficients-h1.json' with { type: 'json' };
import { FEATURE_NAMES } from './features';
import type { AdjustmentConfidence, AvmAdjustment, AvmComparable } from './types';

interface CoeffsShape {
  readonly intercept: number;
  readonly weights: Readonly<Record<string, number>>;
}

const C = coefficients as unknown as CoeffsShape;

// Mapa feature → i18n key estable. Nuevos features agregarán entradas aquí.
const I18N_KEYS: Readonly<Record<string, string>> = {
  sup_construida_m2: 'ie.avm.adjustment.sup_construida',
  sup_terreno_m2: 'ie.avm.adjustment.sup_terreno',
  recamaras: 'ie.avm.adjustment.recamaras',
  banos: 'ie.avm.adjustment.banos',
  medio_banos: 'ie.avm.adjustment.medio_banos',
  estacionamientos: 'ie.avm.adjustment.estacionamientos',
  edad_anos: 'ie.avm.adjustment.edad',
  piso: 'ie.avm.adjustment.piso',
  amenidades_count: 'ie.avm.adjustment.amenidades',
  tipo_depto: 'ie.avm.adjustment.tipo_depto',
  tipo_casa: 'ie.avm.adjustment.tipo_casa',
  tipo_townhouse: 'ie.avm.adjustment.tipo_townhouse',
  f01_safety: 'ie.avm.adjustment.f01_safety',
  f02_transit: 'ie.avm.adjustment.f02_transit',
  f03_ecosystem: 'ie.avm.adjustment.f03_ecosystem',
  f08_lqi: 'ie.avm.adjustment.f08_lqi',
  n01_ecosystem_diversity: 'ie.avm.adjustment.n01',
  n02_employment_access: 'ie.avm.adjustment.n02',
  n08_walkability: 'ie.avm.adjustment.n08',
  n11_momentum: 'ie.avm.adjustment.n11',
  h01_school: 'ie.avm.adjustment.h01',
  h02_health: 'ie.avm.adjustment.h02',
  precio_m2_mediana_zona_12m: 'ie.avm.adjustment.precio_m2_mediana',
  precio_m2_p25: 'ie.avm.adjustment.precio_m2_p25',
  precio_m2_p75: 'ie.avm.adjustment.precio_m2_p75',
  precio_m2_p50_6m: 'ie.avm.adjustment.precio_m2_p50_6m',
  ventas_12m: 'ie.avm.adjustment.ventas_12m',
  dias_en_mercado_avg: 'ie.avm.adjustment.dias_en_mercado',
  absorcion_pct: 'ie.avm.adjustment.absorcion',
  ratio_lista_cierre: 'ie.avm.adjustment.ratio_lista_cierre',
  num_comparables_disponibles: 'ie.avm.adjustment.num_comparables',
  tiie28: 'ie.avm.adjustment.tiie28',
  tasa_hipotecaria_avg: 'ie.avm.adjustment.tasa_hipotecaria',
  inpc: 'ie.avm.adjustment.inpc',
  inpp_construccion: 'ie.avm.adjustment.inpp_construccion',
  tipo_cambio_fix: 'ie.avm.adjustment.tipo_cambio',
  infonavit_vsm: 'ie.avm.adjustment.infonavit_vsm',
  shf_ipv_cdmx: 'ie.avm.adjustment.shf_ipv',
  bbva_oferta: 'ie.avm.adjustment.bbva_oferta',
  roof_garden: 'ie.avm.adjustment.roof_garden',
  orientacion_sur: 'ie.avm.adjustment.orientacion_sur',
  vista_parque: 'ie.avm.adjustment.vista_parque',
  amenidades_premium_count: 'ie.avm.adjustment.amenidades_premium',
  anos_escritura: 'ie.avm.adjustment.anos_escritura',
  estado_conservacion_score: 'ie.avm.adjustment.estado_conservacion',
  seguridad_interna: 'ie.avm.adjustment.seguridad_interna',
  mascotas_ok: 'ie.avm.adjustment.mascotas_ok',
};

const MARKET_CONTEXT_FEATURES = new Set<string>([
  'n11_momentum',
  'absorcion_pct',
  'ventas_12m',
  'dias_en_mercado_avg',
  'ratio_lista_cierre',
  'num_comparables_disponibles',
]);

const COMPARABLE_OVERLAY_FEATURES = new Set<string>([
  'precio_m2_mediana_zona_12m',
  'precio_m2_p25',
  'precio_m2_p75',
  'precio_m2_p50_6m',
]);

function sourceFor(name: string): AvmAdjustment['source'] {
  if (COMPARABLE_OVERLAY_FEATURES.has(name)) return 'comparable_overlay';
  if (MARKET_CONTEXT_FEATURES.has(name)) return 'market_context';
  return 'regression_coefficient';
}

function confidenceFor(contributionAbs: number, isMissing: boolean): AdjustmentConfidence {
  if (isMissing) return 'low';
  if (contributionAbs >= 200000) return 'high';
  if (contributionAbs >= 60000) return 'medium';
  return 'low';
}

export interface BuildAdjustmentsArgs {
  readonly features: readonly number[];
  readonly missing_fields: readonly string[];
  readonly topN?: number;
  // comparables no cambia el adjustments actualmente (H2+). Presente para
  // firma estable + overlay futuro.
  readonly comparables?: readonly AvmComparable[];
}

// Selecciona los top N features por |contribución = weight × x_z| y produce
// adjustments ordenados por magnitude desc. value_pct = contribution / intercept × 100.
export function buildAdjustments(args: BuildAdjustmentsArgs): readonly AvmAdjustment[] {
  const topN = args.topN ?? 8;
  const missingSet = new Set(args.missing_fields);

  const scored = FEATURE_NAMES.map((name, i) => {
    const w = C.weights[name] ?? 0;
    const x = args.features[i] ?? 0;
    const contribution = w * x;
    return { name, contribution, w };
  })
    .filter((e) => Math.abs(e.contribution) > 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, topN);

  return scored.map((e): AvmAdjustment => {
    const valuePct = Number(((e.contribution / C.intercept) * 100).toFixed(2));
    const absContrib = Math.abs(e.contribution);
    const confidence = confidenceFor(absContrib, missingSet.has(e.name));
    const source = sourceFor(e.name);
    const explanationKey = I18N_KEYS[e.name] ?? `ie.avm.adjustment.${e.name}`;
    return {
      feature: e.name,
      value_pct: valuePct,
      source,
      weight: e.w,
      confidence,
      explanation_i18n_key: explanationKey,
    };
  });
}
