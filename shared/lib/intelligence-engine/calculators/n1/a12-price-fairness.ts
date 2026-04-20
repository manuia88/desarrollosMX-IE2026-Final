// A12 Price Fairness — evalúa si el precio ofertado de una propiedad es justo
// respecto al AVM (Automatic Valuation Model) y los comparables de la zona.
// Plan 9.B.4. Catálogo 03.8 §A12. Tier 2. Categoría proyecto (output project_scores).
//
// FÓRMULA (founder decision 2026-04-20 — multiplicador × 4):
//   gap_pct = |precio_ofertado − precio_justo_avm| / precio_justo_avm × 100
//   score   = max(0, 100 − gap_pct × 4)
//
// Semántica Price Fairness: precio justo vs mercado.
//   gap 0%   → score 100 (precio exactamente justo)
//   gap 12.5% → score 50
//   gap 25%  → score 0 (anómalo, overpriced o underpriced)
// Score alto = precio justo. Score bajo = desviación grande (ambos lados).
//
// DIRECTION:
//   overpriced   → precio_ofertado > precio_justo_avm · 1.05 (>+5%)
//   fair         → |gap| ≤ 5%
//   underpriced  → precio_ofertado < precio_justo_avm · 0.95 (<−5%)
//
// TIER 2: requiere ≥10 propiedades en zona (comparables) para activar.
// Si comparables.length < 10 → confidence='insufficient_data' y score=0.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const MIN_COMPARABLES = 10;

export const GAP_MULTIPLIER = 4;

export const methodology = {
  formula:
    'gap_pct = |ofertado − AVM| / AVM · 100; score = max(0, 100 − gap_pct · 4). Tier 2 requires ≥10 comparables en zona.',
  sources: ['unidades', 'market_prices_secondary', 'avm_i01'],
  weights: {
    fair_band_pct: 0.05,
    gap_multiplier: GAP_MULTIPLIER,
    min_comparables: MIN_COMPARABLES,
  },
  references: [
    {
      name: 'DMX AVM I01 — estimador propio',
      url: 'internal://ie/avm-i01',
      period: 'trimestral',
    },
    {
      name: 'SHF Índice de precios vivienda',
      url: 'https://www.gob.mx/shf',
      period: 'trimestral',
    },
  ],
  confidence_thresholds: { high: 30, medium: 15, low: 10 },
  validity: { unit: 'days', value: 30 },
} as const;

export const reasoning_template =
  'Price Fairness propiedad {property_id}: ofertado {precio_ofertado} MXN vs AVM {precio_justo_avm} MXN → gap {gap_pct}% ({direction}). {comparables_count} comparables en zona.';

export type A12Direction = 'overpriced' | 'fair' | 'underpriced';

export interface A12Comparable extends Record<string, unknown> {
  readonly propertyId: string;
  readonly precio_m2_mxn: number;
}

export interface A12Components extends Record<string, unknown> {
  readonly precio_ofertado_mxn: number;
  readonly precio_justo_avm_mxn: number;
  readonly gap_absoluto_mxn: number;
  readonly gap_pct: number;
  readonly direction: A12Direction;
  readonly percentil_zona_p50: number | null;
  readonly comparables_count: number;
  readonly comparables_sample: readonly A12Comparable[];
  readonly tier_gated: boolean;
  readonly missing_dimensions: readonly string[];
}

export interface A12RawInput {
  readonly precio_ofertado: number;
  readonly precio_justo_avm: number;
  readonly percentil_zona_p50?: number;
  readonly comparables: readonly A12Comparable[];
}

export interface A12ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A12Components;
}

function classifyDirection(gap_signed_pct: number): A12Direction {
  if (gap_signed_pct > 5) return 'overpriced';
  if (gap_signed_pct < -5) return 'underpriced';
  return 'fair';
}

export function computeA12PriceFairness(input: A12RawInput): A12ComputeResult {
  const missing: string[] = [];
  const comparables_count = input.comparables.length;
  const tier_gated = comparables_count < MIN_COMPARABLES;

  if (input.percentil_zona_p50 === undefined) missing.push('percentil_zona_p50');

  // Tier gating: si <10 comparables → insufficient_data + score 0.
  if (tier_gated) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        precio_ofertado_mxn: input.precio_ofertado,
        precio_justo_avm_mxn: input.precio_justo_avm,
        gap_absoluto_mxn: 0,
        gap_pct: 0,
        direction: 'fair',
        percentil_zona_p50: input.percentil_zona_p50 ?? null,
        comparables_count,
        comparables_sample: input.comparables.slice(0, 10),
        tier_gated: true,
        missing_dimensions: ['comparables_zona (<10)', ...missing],
      },
    };
  }

  if (input.precio_justo_avm <= 0 || input.precio_ofertado <= 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        precio_ofertado_mxn: input.precio_ofertado,
        precio_justo_avm_mxn: input.precio_justo_avm,
        gap_absoluto_mxn: 0,
        gap_pct: 0,
        direction: 'fair',
        percentil_zona_p50: input.percentil_zona_p50 ?? null,
        comparables_count,
        comparables_sample: input.comparables.slice(0, 10),
        tier_gated: false,
        missing_dimensions: ['precios_invalidos', ...missing],
      },
    };
  }

  const gap_absoluto = input.precio_ofertado - input.precio_justo_avm;
  const gap_signed_pct = (gap_absoluto / input.precio_justo_avm) * 100;
  const gap_pct = Math.abs(gap_signed_pct);
  const direction = classifyDirection(gap_signed_pct);
  const value = Math.max(0, Math.min(100, Math.round(100 - gap_pct * GAP_MULTIPLIER)));

  // Confidence basado en comparables_count: high ≥30, medium ≥15, low ≥10.
  let confidence: Confidence;
  if (comparables_count >= 30) confidence = 'high';
  else if (comparables_count >= 15) confidence = 'medium';
  else confidence = 'low';

  return {
    value,
    confidence,
    components: {
      precio_ofertado_mxn: input.precio_ofertado,
      precio_justo_avm_mxn: input.precio_justo_avm,
      gap_absoluto_mxn: Math.round(gap_absoluto),
      gap_pct: Number(gap_pct.toFixed(2)),
      direction,
      percentil_zona_p50: input.percentil_zona_p50 ?? null,
      comparables_count,
      comparables_sample: input.comparables.slice(0, 10),
      tier_gated: false,
      missing_dimensions: missing,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a12.insufficient';
  if (value >= 90) return 'ie.score.a12.precio_justo';
  if (value >= 70) return 'ie.score.a12.precio_cercano';
  if (value >= 40) return 'ie.score.a12.precio_desviado';
  return 'ie.score.a12.precio_anomalo';
}

export const a12PriceFairnessCalculator: Calculator = {
  scoreId: 'A12',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams =
      typeof params.precio_ofertado === 'number' && typeof params.precio_justo_avm === 'number';
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeA12PriceFairness directo'
          : 'params precio_ofertado/precio_justo_avm no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        {
          source: 'unidades',
          url: 'internal://supabase/unidades',
          period: 'realtime',
        },
        {
          source: 'avm_i01',
          url: 'internal://ie/avm-i01',
          period: 'trimestral',
        },
      ],
      provenance: {
        sources: [
          { name: 'unidades', count: 0 },
          { name: 'avm_i01', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { property_id: input.projectId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a12PriceFairnessCalculator;
