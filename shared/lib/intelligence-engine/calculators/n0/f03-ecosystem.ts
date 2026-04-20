// F03 Ecosystem DENUE — densidad + diversidad + calidad del comercio.
// Plan 8.B.3. Catálogo 03.8 §F03. Usa shared/lib/scian propietario.
//
// Fórmula (4 componentes × 25 pts = 100):
//   shannon_score      = (H / ln(12)) × 25         // diversidad 12 macro categorías
//   scaled_log_score   = min(1, log(total+1)/log(1001)) × 25   // volumen 1000+ → max
//   premium_ratio_score = (high / total) × 25       // calidad promedio
//   anchor_score       = 25 si hay hospital (DGIS 2°) + universidad (SIGED ≥3)
//                        + centro comercial (DENUE ≥200) — proxy anchors
//
// Confidence DENUE (catálogo 03.8): high ≥100, medium ≥20, low ≥1.

import type { SupabaseClient } from '@supabase/supabase-js';
import { SCIAN_MACRO_CATEGORY_KEYS, shannonDiversity } from '@/shared/lib/scian';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = 25·(H/ln(12)) + 25·min(1, log(total+1)/log(1001)) + 25·(high/total) + 25·anchor_bool. Shannon sobre 12 macro categorías SCIAN propietario.',
  sources: ['denue'],
  weights: { shannon: 25, volume: 25, premium_ratio: 25, anchor: 25 },
  references: [
    {
      name: 'DENUE INEGI',
      url: 'https://www.inegi.org.mx/app/mapa/denue/',
      period: 'snapshot',
    },
  ],
  confidence_thresholds: { high: 100, medium: 20, low: 1 },
  scian_mapping: 'shared/lib/scian — 33 premium + 80 standard + 30 basic, 12 macro categorías',
} as const;

export const reasoning_template =
  'Ecosystem de {zona_name} obtiene {score_value} por {total} establecimientos DENUE (premium_ratio {premium_ratio}, Shannon H={shannon}, anchor={anchor_presence}). Top categorías: {top_categories}. Confianza {confidence}.';

const LOG_VOLUME_REFERENCE = Math.log(1001); // 1000 establecimientos → volumen score max
const SHANNON_MAX = Math.log(12); // 12 macro categorías → H_max

export interface F03Components extends Record<string, unknown> {
  readonly shannon: number;
  readonly shannon_score: number;
  readonly volume_score: number;
  readonly premium_ratio: number;
  readonly premium_ratio_score: number;
  readonly anchor_presence: boolean;
  readonly anchor_score: number;
  readonly total: number;
  readonly tier_counts: {
    readonly high: number;
    readonly standard: number;
    readonly basic: number;
  };
  readonly scian_by_macro_category: Readonly<Record<string, number>>;
  readonly top_categories: readonly string[];
}

export interface F03RawInput {
  readonly total: number;
  readonly tier_counts: {
    readonly high: number;
    readonly standard: number;
    readonly basic: number;
  };
  readonly by_macro_category: Readonly<Record<string, number>>;
  readonly anchors?: {
    readonly clues_2do_nivel: number; // hospital 2° nivel
    readonly siged_total_1km: number; // universidades/escuelas proxy
  };
}

export interface F03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F03Components;
}

function detectAnchorPresence(input: F03RawInput): boolean {
  const a = input.anchors;
  if (!a) return false;
  // Proxy: hospital 2° + universidad proxy (SIGED ≥3 escuelas) + centro comercial proxy (DENUE ≥200).
  return a.clues_2do_nivel >= 1 && a.siged_total_1km >= 3 && input.total >= 200;
}

function topCategories(counts: Readonly<Record<string, number>>, n: number): readonly string[] {
  return [...SCIAN_MACRO_CATEGORY_KEYS]
    .map((k) => ({ key: k as string, count: counts[k] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .filter((x) => x.count > 0)
    .map((x) => x.key);
}

export function computeF03Ecosystem(input: F03RawInput): F03ComputeResult {
  const { total, tier_counts, by_macro_category } = input;

  const shannon = shannonDiversity(by_macro_category);
  const shannon_score = Math.min(25, (shannon / SHANNON_MAX) * 25);
  const volume_score =
    total > 0 ? Math.min(25, (Math.log(total + 1) / LOG_VOLUME_REFERENCE) * 25) : 0;
  const premium_ratio = total > 0 ? tier_counts.high / total : 0;
  const premium_ratio_score = Math.min(25, premium_ratio * 25);
  const anchor_presence = detectAnchorPresence(input);
  const anchor_score = anchor_presence ? 25 : 0;

  const value = Math.max(
    0,
    Math.min(100, Math.round(shannon_score + volume_score + premium_ratio_score + anchor_score)),
  );

  const confidence = detectConfidenceByVolume(total, CONFIDENCE_THRESHOLDS.denue);

  return {
    value,
    confidence,
    components: {
      shannon: Number(shannon.toFixed(3)),
      shannon_score: Number(shannon_score.toFixed(2)),
      volume_score: Number(volume_score.toFixed(2)),
      premium_ratio: Number(premium_ratio.toFixed(3)),
      premium_ratio_score: Number(premium_ratio_score.toFixed(2)),
      anchor_presence,
      anchor_score,
      total,
      tier_counts,
      scian_by_macro_category: by_macro_category,
      top_categories: topCategories(by_macro_category, 3),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f03.insufficient';
  if (value >= 80) return 'ie.score.f03.diversa_robusta';
  if (value >= 60) return 'ie.score.f03.diversa';
  if (value >= 40) return 'ie.score.f03.moderada';
  return 'ie.score.f03.limitada';
}

export const f03EcosystemCalculator: Calculator = {
  scoreId: 'F03',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'DENUE geo_data_points no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'denue', url: 'https://www.inegi.org.mx/app/mapa/denue/', period: 'snapshot' },
      ],
      provenance: {
        sources: [{ name: 'denue', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default f03EcosystemCalculator;
