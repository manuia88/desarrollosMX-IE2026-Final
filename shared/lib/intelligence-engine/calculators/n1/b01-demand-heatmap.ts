// B01 Demand Heatmap — N1 score que cruza señales de demanda por zona
// (wishlist + search_logs + project_views) últimos 30 días y normaliza contra
// el máximo CDMX para producir un heatmap de intención de compra.
// Plan FASE 09 §9.C.1. Catálogo 03.8 §B01.
//
// Fórmula (pesos default por catálogo 03.8 §B01 — wishlist > searches > views):
//   intention_raw        = wishlist_count·0.5 + searches_count·0.3 + views_count·0.2
//   intention_normalized = clamp01((intention_raw / max_intention_cdmx) × 100)
//   score_value          = round(intention_normalized)
//
// D8 — weights runtime: loadWeights(score_weights) override per (score_id,
// country_code). Fallback a DEFAULT_WEIGHTS si tabla vacía. Dimensions:
//   B01.wishlist, B01.searches, B01.views.
//
// Benchmark H1 — max_intention_cdmx default = 1000 (zona top Del Valle/Polanco
// con ~200 wishlist + 1K views + 500 searches). En H2 viene de materialized
// view `zone_intention_max_cdmx` (ventana móvil 30d).
//
// Período < 30 días → confidence forzado a 'low'. Con ≥30 días:
//   high   intention_raw ≥ 500
//   medium intention_raw ≥ 100
//   low    intention_raw ≥ 10
//   insufficient_data < 10
//
// Tier 3 (requiere ≥50 proyectos + 6m data). En catálogo tier 1 hasta H2 —
// este calculator declara tier=1 para consumo temprano con gating externo.
// Category: dev → persist en zone_scores (category='dev').

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { loadWeights, type WeightsMap } from '../weights-loader';

export const version = '1.0.0';

// Benchmark H1: zona top CDMX (Del Valle/Polanco) — ~200 wishlist·0.5 + 500
// searches·0.3 + 1000 views·0.2 = 450. Con holgura para outliers: 1000.
// H2 override desde materialized view zone_intention_max_cdmx.
export const DEFAULT_MAX_INTENTION_CDMX = 1000;

export const DEFAULT_WEIGHTS: WeightsMap = {
  wishlist: 0.5,
  searches: 0.3,
  views: 0.2,
};

export const methodology = {
  formula:
    'intention_raw = wishlist·0.5 + searches·0.3 + views·0.2; intention_normalized = (intention_raw / max_intention_cdmx) × 100; score = round(intention_normalized).',
  sources: ['wishlist', 'search_logs', 'project_views'],
  weights: DEFAULT_WEIGHTS,
  benchmark: {
    max_intention_cdmx_default: DEFAULT_MAX_INTENTION_CDMX,
    source_h2: 'materialized_view:zone_intention_max_cdmx',
  },
  confidence_thresholds: {
    min_period_days: 30,
    high_intention: 500,
    medium_intention: 100,
    low_intention: 10,
  },
  references: [
    {
      name: 'Catálogo 03.8 §B01 Demand Heatmap',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b01-demand-heatmap',
    },
    {
      name: 'Plan FASE 09 §9.C.1',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 7 } as const,
  tier_gating: {
    tier: 3,
    min_projects: 50,
    min_months_data: 6,
  },
} as const;

export const reasoning_template =
  'Demanda de {zona_name} obtiene {score_value} por {wishlist_count} wishlist + {searches_count} búsquedas + {views_count} vistas (últimos {period_days} días). Intención ponderada {intention_raw} vs máximo CDMX {max_intention_cdmx}. Percentil zona {percentile_cdmx}. Confianza {confidence}.';

export type DemandBucket = 'muy_alta' | 'alta' | 'media' | 'baja' | 'insufficient';

export interface B01Components extends Record<string, unknown> {
  readonly searches_count: number;
  readonly wishlist_count: number;
  readonly views_count: number;
  readonly intention_raw: number;
  readonly intention_normalized: number;
  readonly percentile_cdmx: number;
  readonly max_intention_cdmx: number;
  readonly period_days: number;
  readonly pesos_aplicados: Readonly<Record<string, number>>;
  readonly bucket: DemandBucket;
}

export interface B01RawInput {
  readonly searches_count: number;
  readonly wishlist_count: number;
  readonly views_count: number;
  readonly period_days: number;
  readonly max_intention_cdmx?: number;
}

export interface B01ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface B01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B01Components;
}

function bucketFor(score: number, confidence: Confidence): DemandBucket {
  if (confidence === 'insufficient_data') return 'insufficient';
  if (score >= 80) return 'muy_alta';
  if (score >= 60) return 'alta';
  if (score >= 30) return 'media';
  return 'baja';
}

function detectConfidence(intention_raw: number, period_days: number): Confidence {
  if (period_days < methodology.confidence_thresholds.min_period_days) {
    // Periodos cortos: cap a 'low' incluso si el volumen es alto — muestra
    // insuficiente temporalmente (no cubre ciclo mensual completo).
    if (intention_raw < methodology.confidence_thresholds.low_intention) return 'insufficient_data';
    return 'low';
  }
  if (intention_raw >= methodology.confidence_thresholds.high_intention) return 'high';
  if (intention_raw >= methodology.confidence_thresholds.medium_intention) return 'medium';
  if (intention_raw >= methodology.confidence_thresholds.low_intention) return 'low';
  return 'insufficient_data';
}

export function computeB01DemandHeatmap(
  input: B01RawInput,
  options: B01ComputeOptions = {},
): B01ComputeResult {
  const weights = options.weightsOverride ?? DEFAULT_WEIGHTS;
  const w_wishlist = weights.wishlist ?? DEFAULT_WEIGHTS.wishlist ?? 0.5;
  const w_searches = weights.searches ?? DEFAULT_WEIGHTS.searches ?? 0.3;
  const w_views = weights.views ?? DEFAULT_WEIGHTS.views ?? 0.2;

  const wishlist_count = Math.max(0, input.wishlist_count);
  const searches_count = Math.max(0, input.searches_count);
  const views_count = Math.max(0, input.views_count);

  const intention_raw =
    wishlist_count * w_wishlist + searches_count * w_searches + views_count * w_views;

  const max_intention_cdmx = input.max_intention_cdmx ?? DEFAULT_MAX_INTENTION_CDMX;
  const safe_max = max_intention_cdmx > 0 ? max_intention_cdmx : DEFAULT_MAX_INTENTION_CDMX;
  const ratio = intention_raw / safe_max;
  const intention_normalized = Math.max(0, Math.min(100, ratio * 100));
  const value = Math.round(intention_normalized);

  const confidence = detectConfidence(intention_raw, input.period_days);
  const bucket = bucketFor(value, confidence);

  const pesos_aplicados: Record<string, number> = {
    wishlist: Number(w_wishlist.toFixed(4)),
    searches: Number(w_searches.toFixed(4)),
    views: Number(w_views.toFixed(4)),
  };

  return {
    value,
    confidence,
    components: {
      searches_count,
      wishlist_count,
      views_count,
      intention_raw: Number(intention_raw.toFixed(2)),
      intention_normalized: Number(intention_normalized.toFixed(2)),
      percentile_cdmx: Number((Math.max(0, Math.min(1, ratio)) * 100).toFixed(2)),
      max_intention_cdmx: safe_max,
      period_days: input.period_days,
      pesos_aplicados,
      bucket,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b01.insufficient';
  if (value >= 80) return 'ie.score.b01.muy_alta_demanda';
  if (value >= 60) return 'ie.score.b01.alta_demanda';
  if (value >= 30) return 'ie.score.b01.demanda_media';
  return 'ie.score.b01.baja_demanda';
}

export const b01DemandHeatmapCalculator: Calculator = {
  scoreId: 'B01',
  version,
  tier: 1,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const zoneId = input.zoneId;
    if (!zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'B01 requiere zoneId para agregar wishlist/searches/views.',
        },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'wishlist', count: 0 }],
          computed_at,
          calculator_version: version,
        },
        template_vars: { zona_name: 'desconocida' },
      };
    }

    // Prod-path: query wishlist + search_logs + project_views últimos 30 días
    // por zona + materialized view zone_intention_max_cdmx. FASE 09 session 2
    // conecta SupabaseClient. Tests invocan computeB01DemandHeatmap() directo
    // con fixture data.
    const runtimeWeights = await loadWeights(supabase, 'B01', input.countryCode);
    const weightsOverride = runtimeWeights ?? DEFAULT_WEIGHTS;

    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'wishlist/search_logs/project_views no aggregated for zone+period',
        note: 'Use computeB01DemandHeatmap(rawInput) con fixture data para tests.',
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
        pesos_aplicados: weightsOverride,
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId,
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence,
      citations: [
        { source: 'wishlist', period: 'last 30d' },
        { source: 'search_logs', period: 'last 30d' },
        { source: 'project_views', period: 'last 30d' },
      ],
      provenance: {
        sources: [
          { name: 'wishlist', count: 0 },
          { name: 'search_logs', count: 0 },
          { name: 'project_views', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: zoneId, period_days: 30 },
    };
  },
};

export default b01DemandHeatmapCalculator;
