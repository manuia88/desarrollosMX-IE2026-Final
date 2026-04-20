// H07 Environmental (N1) — calidad ambiental zonal.
// Plan FASE 09 MÓDULO 9.A.3. Catálogo 03.8 §H07.
//
// H1 implementación: solo F04 Air Quality + parques básicos OSM (opcional).
// H2 agregará SEDEMA parques oficiales y PAOT denuncias ambientales.
//
// Fórmula H1:
//   Si parques_densidad disponible: score = 0.8·F04 + 0.2·parques_densidad
//   Si solo F04:                    score = F04 (passthrough)
//
// Default weights H1: F04=1.00. Parques H2 entran con 0.20 cuando SEDEMA activo.
// D8 override vía score_weights. D9 fallback si F04 missing → insufficient_data.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { composeConfidence } from '../confidence';
import {
  loadWeights,
  type RenormalizedWeights,
  renormalizeWeights,
  type WeightsMap,
} from '../weights-loader';

export const version = '1.0.0';

export const DEFAULT_WEIGHTS: Readonly<Record<'F04', number>> = {
  F04: 1.0,
} as const;

// Weights H2 (cuando SEDEMA parques activen): F04=0.8, parques=0.2.
// H1 se decide en compute() si parques_densidad se pasa explícito.
const PARQUES_BLEND_WEIGHT = 0.2;
const F04_BLEND_WEIGHT = 0.8;

export const methodology = {
  formula:
    'H1: score = F04 (passthrough). Si parques_densidad disponible: 0.8·F04 + 0.2·parques_densidad. H2 activa SEDEMA oficial + PAOT denuncias.',
  sources: ['rama_sinaica', 'osm_parques'],
  weights: { ...DEFAULT_WEIGHTS },
  references: [
    {
      name: 'Catálogo 03.8 §H07 Environmental',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h07-environmental',
    },
    { name: 'RAMA CDMX', url: 'https://aire.cdmx.gob.mx/' },
    { name: 'OSM parques', url: 'https://www.openstreetmap.org/' },
  ],
  dependencies: [{ score_id: 'F04', weight: 1.0, role: 'air_quality' }],
  validity: { unit: 'days', value: 30 } as const,
  h2_roadmap: ['sedema_parques_oficial', 'paot_denuncias'],
} as const;

export const reasoning_template =
  'Environmental de {zona_name} obtiene {score_value} basado en F04 Air Quality ({f04_value}){parques_suffix}. Confianza {confidence}.';

export interface H07Components extends Record<string, unknown> {
  readonly f04_value: number | null;
  readonly parques_densidad: number | null;
  readonly blend_mode: 'f04_only' | 'f04_plus_parques';
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly dims_usadas: number;
  readonly dims_total: number;
}

export interface H07RawInput {
  // F04 Air Quality score (0-100, 100=aire limpio). null = no disponible.
  readonly F04: number | null;
  // Opcional H1: densidad de parques OSM normalizada 0-100 (count parques/km²).
  readonly parques_densidad?: number | null;
  // Confidence de F04 (la peor manda en composición si hay múltiples deps).
  readonly confidences?: Readonly<Partial<Record<'F04', Confidence>>>;
}

export interface H07ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H07Components;
}

export interface H07ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function computeH07Environmental(
  input: H07RawInput,
  options: H07ComputeOptions = {},
): H07ComputeResult {
  const base: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;
  const available: string[] = [];
  if (input.F04 !== null && input.F04 !== undefined && Number.isFinite(input.F04)) {
    available.push('F04');
  }

  const renorm: RenormalizedWeights = renormalizeWeights(base, available);

  // Si F04 missing → insufficient_data. Parques solos no alcanzan en H1.
  if (renorm.available_count === 0 || input.F04 === null || input.F04 === undefined) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        f04_value: null,
        parques_densidad: input.parques_densidad ?? null,
        blend_mode: 'f04_only',
        weights_applied: renorm.weights,
        missing_dimensions: renorm.missing_dimensions,
        dims_usadas: renorm.available_count,
        dims_total: renorm.total_count,
      },
    };
  }

  const f04 = clamp100(input.F04);
  const hasParques =
    input.parques_densidad !== null &&
    input.parques_densidad !== undefined &&
    Number.isFinite(input.parques_densidad);

  let value: number;
  let blend_mode: 'f04_only' | 'f04_plus_parques';
  if (hasParques) {
    const parques = clamp100(input.parques_densidad as number);
    value = Math.round(F04_BLEND_WEIGHT * f04 + PARQUES_BLEND_WEIGHT * parques);
    blend_mode = 'f04_plus_parques';
  } else {
    value = Math.round(f04);
    blend_mode = 'f04_only';
  }
  value = Math.max(0, Math.min(100, value));

  // Confidence: derivada de F04. Si caller provee per-dep, compose.
  const sub: Confidence[] = [];
  if (input.confidences?.F04) sub.push(input.confidences.F04);
  const confidence: Confidence = sub.length > 0 ? composeConfidence(sub) : 'high';

  return {
    value,
    confidence,
    components: {
      f04_value: f04,
      parques_densidad: hasParques ? clamp100(input.parques_densidad as number) : null,
      blend_mode,
      weights_applied: renorm.weights,
      missing_dimensions: renorm.missing_dimensions,
      dims_usadas: renorm.available_count,
      dims_total: renorm.total_count,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h07.insufficient';
  if (value >= 75) return 'ie.score.h07.excelente';
  if (value >= 55) return 'ie.score.h07.buena';
  if (value >= 35) return 'ie.score.h07.moderada';
  return 'ie.score.h07.contaminada';
}

export const h07EnvironmentalCalculator: Calculator = {
  scoreId: 'H07',
  version,
  tier: 1,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    // D8 runtime weights override. Fallback defaults.
    const runtimeWeights = await loadWeights(supabase, 'H07', input.countryCode).catch(() => null);
    const weights = runtimeWeights ?? DEFAULT_WEIGHTS;
    const renorm = renormalizeWeights(weights, []);
    const computed_at = new Date().toISOString();
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        f04_value: null,
        parques_densidad: null,
        blend_mode: 'f04_only',
        weights_applied: renorm.weights,
        missing_dimensions: Object.keys(weights),
        dims_usadas: 0,
        dims_total: renorm.total_count,
        reason: 'H07 requiere F04 persistido en zone_scores. Use computeH07Environmental(input).',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'rama_sinaica', url: 'https://aire.cdmx.gob.mx/', period: 'pending_h2' },
        { source: 'osm_parques', url: 'https://www.openstreetmap.org/' },
      ],
      provenance: {
        sources: [
          { name: 'rama_sinaica', count: 0 },
          { name: 'osm_parques', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: input.zoneId ?? 'desconocida',
        f04_value: 0,
        parques_suffix: '',
      },
    };
  },
};

export default h07EnvironmentalCalculator;
