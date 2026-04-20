// H16 Neighborhood Evolution — score N2 que construye narrativa 5y de la zona.
// Plan FASE 10 §10.A.14. Catálogo 03.8 §H16.
//
// Consolida:
//   - F10 fase_gentrificacion (inicial|media|tardia|post_gentrificada)
//   - N03 velocity (0-100)
//   - N04 crime trajectory (0-100; alto = trayectoria mejor)
//   - price_index zona delta 5y (pct acumulado)
//
// Clasifica narrativa_tipo (components.narrativa_tipo):
//   'gentrificada_post_2017'  → fase=post_gentrificada ∨ (fase=tardia ∧ price_delta_5y>50%)
//   'apreciacion_activa'      → fase∈{media,tardia} ∧ N03≥55 ∧ price_delta_5y>20%
//   'estable'                 → N03 40-65 ∧ |price_delta_5y|≤15% ∧ N04≥50
//   'declive'                 → N04<40 ∧ price_delta_5y<0 ∧ N03<40
//
// score_evolucion (0-100): composite con pesos
//   0.35·F10_score + 0.25·N03 + 0.20·N04 + 0.20·price_signal_5y
//   price_signal_5y = clamp(precio_delta_5y · 200, 0, 100)  (+50% → 100)
//
// Output components: { fase_gentrificacion, tendencia_demografia, tendencia_seguridad,
//                      narrativa_tipo, score_evolucion }
//
// D13 — critical dep: F10 (score compuesto upstream). Sin F10 → insufficient.
// N03, N04, price_delta_5y son supporting (degradan confidence).
//
// Tier 2 (F10 ya es tier 3; consumir score calculado evita tier gate extra aquí).

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectDepConfidences, propagateConfidence } from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type H16Phase = 'inicial' | 'media' | 'tardia' | 'post_gentrificada' | 'desconocida';

export type H16NarrativaTipo =
  | 'gentrificada_post_2017'
  | 'apreciacion_activa'
  | 'estable'
  | 'declive'
  | 'insufficient';

export type H16Tendencia = 'ascendente' | 'estable' | 'descendente' | 'desconocida';

export const DEFAULT_WEIGHTS = {
  F10: 0.35,
  N03: 0.25,
  N04: 0.2,
  price_delta_5y: 0.2,
} as const;

export const PRICE_DELTA_SCALE_5Y = 200; // +50% → 100

export const methodology = {
  formula:
    'score_evolucion = 0.35·F10 + 0.25·N03 + 0.20·N04 + 0.20·clamp(price_delta_5y·200,0,100). Narrativa por reglas sobre F10 fase + N03/N04 + delta 5y.',
  sources: [
    'zone_scores:F10',
    'zone_scores:N03',
    'zone_scores:N04',
    'market_prices_secondary:price_index_5y',
  ],
  weights: DEFAULT_WEIGHTS,
  dependencies: [
    { score_id: 'F10', weight: 0.35, role: 'fase_gentrificacion', critical: true },
    { score_id: 'N03', weight: 0.25, role: 'velocity_demografica', critical: false },
    { score_id: 'N04', weight: 0.2, role: 'trayectoria_seguridad', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §H16 Neighborhood Evolution',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h16-neighborhood-evolution',
    },
    {
      name: 'Plan FASE 10 §10.A.14',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 60 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 100,
  },
  sensitivity_analysis: {
    most_sensitive_input: 'F10_fase_gentrificacion',
    impact_notes: [
      'F10 post_gentrificada fuerza narrativa "gentrificada_post_2017" casi siempre.',
      'price_delta_5y>+50% satura price_signal a 100 (apreciación activa).',
      'N04 bajo <40 + N03 bajo + precio plano → narrativa "declive".',
      'Sin F10 válido el calculator entrega insufficient_data (dep crítica).',
    ],
  },
} as const;

export const reasoning_template =
  'Evolución de {zona_name} 5y: {narrativa_tipo} (score={score_value}). Fase gentrificación F10={fase_gentrificacion}, demografía N03 {tendencia_demografia}, seguridad N04 {tendencia_seguridad}, precio 5y {price_delta_5y_pct}%. Confianza {confidence}.';

export interface H16Components extends Record<string, unknown> {
  readonly fase_gentrificacion: H16Phase;
  readonly tendencia_demografia: H16Tendencia;
  readonly tendencia_seguridad: H16Tendencia;
  readonly narrativa_tipo: H16NarrativaTipo;
  readonly score_evolucion: number;
  readonly subscores: Readonly<{
    F10: number | null;
    N03: number | null;
    N04: number | null;
    price_delta_5y_pct: number | null;
  }>;
  readonly price_signal_5y: number | null;
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
  readonly coverage_pct: number;
  readonly cap_reason: string | null;
  readonly capped_by: readonly string[];
}

export interface H16RawInput {
  readonly F10_score: number | null;
  readonly F10_fase: H16Phase | null;
  readonly N03_velocity: number | null;
  readonly N04_crime_trajectory: number | null;
  readonly price_index_zona_5y_delta_pct: number | null;
  readonly confidences?: {
    readonly F10?: Confidence;
    readonly N03?: Confidence;
    readonly N04?: Confidence;
  };
}

export interface H16ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H16Components;
}

const CRITICAL_DEPS: readonly string[] = ['F10'];
const TOTAL_DEPS = 4;

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function tendenciaFromScore(v: number | null): H16Tendencia {
  if (v === null || !Number.isFinite(v)) return 'desconocida';
  if (v >= 65) return 'ascendente';
  if (v >= 40) return 'estable';
  return 'descendente';
}

function classifyNarrativa(input: {
  fase: H16Phase;
  n03: number | null;
  n04: number | null;
  priceDelta5y: number | null;
}): H16NarrativaTipo {
  const { fase, n03, n04, priceDelta5y } = input;
  const priceDelta = priceDelta5y ?? 0;

  if (fase === 'post_gentrificada') return 'gentrificada_post_2017';
  if (fase === 'tardia' && priceDelta > 0.5) return 'gentrificada_post_2017';

  if ((fase === 'media' || fase === 'tardia') && (n03 ?? 0) >= 55 && priceDelta > 0.2) {
    return 'apreciacion_activa';
  }

  if (n03 !== null && n03 >= 40 && n03 <= 65 && Math.abs(priceDelta) <= 0.15 && (n04 ?? 0) >= 50) {
    return 'estable';
  }

  if ((n04 ?? 100) < 40 && priceDelta < 0 && (n03 ?? 100) < 40) {
    return 'declive';
  }

  // Fallback suave según fase.
  if (fase === 'inicial') return 'estable';
  return 'apreciacion_activa';
}

export function computeH16NeighborhoodEvolution(input: H16RawInput): H16ComputeResult {
  const missing: string[] = [];
  const hasF10 = input.F10_score !== null && Number.isFinite(input.F10_score);
  const hasN03 = input.N03_velocity !== null && Number.isFinite(input.N03_velocity);
  const hasN04 = input.N04_crime_trajectory !== null && Number.isFinite(input.N04_crime_trajectory);
  const hasPrice =
    input.price_index_zona_5y_delta_pct !== null &&
    Number.isFinite(input.price_index_zona_5y_delta_pct);
  if (!hasF10) missing.push('F10');
  if (!hasN03) missing.push('N03');
  if (!hasN04) missing.push('N04');
  if (!hasPrice) missing.push('price_delta_5y');

  const available_count = TOTAL_DEPS - missing.length;
  const coverage_pct = Math.round((available_count / TOTAL_DEPS) * 100);

  if (!hasF10) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        fase_gentrificacion: input.F10_fase ?? 'desconocida',
        tendencia_demografia: tendenciaFromScore(input.N03_velocity),
        tendencia_seguridad: tendenciaFromScore(input.N04_crime_trajectory),
        narrativa_tipo: 'insufficient',
        score_evolucion: 0,
        subscores: {
          F10: input.F10_score,
          N03: input.N03_velocity,
          N04: input.N04_crime_trajectory,
          price_delta_5y_pct: input.price_index_zona_5y_delta_pct,
        },
        price_signal_5y: null,
        weights_applied: {},
        missing_dimensions: missing,
        available_count,
        total_count: TOTAL_DEPS,
        coverage_pct,
        cap_reason: 'critical_dependency_missing',
        capped_by: ['F10'],
      },
    };
  }

  const f10 = input.F10_score as number;
  const n03 = hasN03 ? (input.N03_velocity as number) : null;
  const n04 = hasN04 ? (input.N04_crime_trajectory as number) : null;
  const priceDelta5y = hasPrice ? (input.price_index_zona_5y_delta_pct as number) : null;
  const priceSignal = hasPrice ? clamp100((priceDelta5y as number) * PRICE_DELTA_SCALE_5Y) : null;

  // Renormalize weights.
  const baseWeights = {
    F10: DEFAULT_WEIGHTS.F10,
    N03: hasN03 ? DEFAULT_WEIGHTS.N03 : 0,
    N04: hasN04 ? DEFAULT_WEIGHTS.N04 : 0,
    price_delta_5y: hasPrice ? DEFAULT_WEIGHTS.price_delta_5y : 0,
  };
  const sumW = baseWeights.F10 + baseWeights.N03 + baseWeights.N04 + baseWeights.price_delta_5y;
  const norm = (v: number): number => (sumW > 0 ? Number((v / sumW).toFixed(4)) : 0);
  const weights = {
    F10: norm(baseWeights.F10),
    N03: norm(baseWeights.N03),
    N04: norm(baseWeights.N04),
    price_delta_5y: norm(baseWeights.price_delta_5y),
  };

  const scoreEvolucion = clamp100(
    f10 * weights.F10 +
      (n03 ?? 0) * weights.N03 +
      (n04 ?? 0) * weights.N04 +
      (priceSignal ?? 0) * weights.price_delta_5y,
  );
  const value = Math.round(scoreEvolucion);

  const fase: H16Phase = input.F10_fase ?? 'desconocida';
  const narrativa = classifyNarrativa({
    fase,
    n03,
    n04,
    priceDelta5y,
  });

  // Confidence propagation (D13).
  const depConfs: Array<{ scoreId: string; confidence: Confidence }> = [
    { scoreId: 'F10', confidence: input.confidences?.F10 ?? 'medium' },
  ];
  if (hasN03) depConfs.push({ scoreId: 'N03', confidence: input.confidences?.N03 ?? 'medium' });
  if (hasN04) depConfs.push({ scoreId: 'N04', confidence: input.confidences?.N04 ?? 'medium' });

  const { critical, supporting } = collectDepConfidences(depConfs, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  return {
    value,
    confidence: propagation.confidence,
    components: {
      fase_gentrificacion: fase,
      tendencia_demografia: tendenciaFromScore(n03),
      tendencia_seguridad: tendenciaFromScore(n04),
      narrativa_tipo: narrativa,
      score_evolucion: Number(scoreEvolucion.toFixed(2)),
      subscores: {
        F10: f10,
        N03: n03,
        N04: n04,
        price_delta_5y_pct: priceDelta5y,
      },
      price_signal_5y: priceSignal,
      weights_applied: weights,
      missing_dimensions: missing,
      available_count,
      total_count: TOTAL_DEPS,
      coverage_pct,
      cap_reason: propagation.cap_reason,
      capped_by: propagation.capped_by,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h16.insufficient';
  if (value >= 75) return 'ie.score.h16.gentrificada_post_2017';
  if (value >= 55) return 'ie.score.h16.apreciacion_activa';
  if (value >= 35) return 'ie.score.h16.estable';
  return 'ie.score.h16.declive';
}

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly confidence: Confidence | null;
  readonly components: Record<string, unknown> | null;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

async function fetchDeps(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<{
  input: H16RawInput;
  sources: Array<{ name: string; count: number }>;
}> {
  const input: {
    F10_score: number | null;
    F10_fase: H16Phase | null;
    N03_velocity: number | null;
    N04_crime_trajectory: number | null;
    price_index_zona_5y_delta_pct: number | null;
    confidences: { F10?: Confidence; N03?: Confidence; N04?: Confidence };
  } = {
    F10_score: null,
    F10_fase: null,
    N03_velocity: null,
    N04_crime_trajectory: null,
    price_index_zona_5y_delta_pct: null,
    confidences: {},
  };
  const sources: Array<{ name: string; count: number }> = [];

  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_type, score_value, confidence, components')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', ['F10', 'N03', 'N04']);
    if (data) {
      const rows = data as unknown as readonly ZoneScoreRow[];
      for (const row of rows) {
        if (row.score_type === 'F10' && row.score_value !== null) {
          input.F10_score = row.score_value;
          const comp = row.components as { fase_gentrificacion?: H16Phase } | null;
          if (comp?.fase_gentrificacion) input.F10_fase = comp.fase_gentrificacion;
          if (row.confidence) input.confidences.F10 = row.confidence;
          sources.push({ name: 'zone_scores:F10', count: 1 });
        } else if (row.score_type === 'N03' && row.score_value !== null) {
          input.N03_velocity = row.score_value;
          if (row.confidence) input.confidences.N03 = row.confidence;
          sources.push({ name: 'zone_scores:N03', count: 1 });
        } else if (row.score_type === 'N04' && row.score_value !== null) {
          input.N04_crime_trajectory = row.score_value;
          if (row.confidence) input.confidences.N04 = row.confidence;
          sources.push({ name: 'zone_scores:N04', count: 1 });
        }
      }
    }
  } catch {
    // swallow
  }

  return { input, sources };
}

export const h16NeighborhoodEvolutionCalculator: Calculator = {
  scoreId: 'H16',
  version,
  tier: 2,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const valid_until = computeValidUntil(new Date(computed_at), methodology.validity);
    const zoneId = input.zoneId;
    if (!zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: { reason: 'H16 requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores', count: 0 }],
          computed_at,
          calculator_version: version,
        },
        template_vars: { zona_name: 'desconocida' },
        valid_until,
      };
    }

    const { input: raw, sources } = await fetchDeps(supabase, zoneId, input.periodDate);
    const result = computeH16NeighborhoodEvolution(raw);

    const citations = methodology.dependencies.map((d) => ({
      source: `zone_scores:${d.score_id}`,
      period: input.periodDate,
    }));

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: result.components,
      inputs_used: { periodDate: input.periodDate, zoneId },
      confidence: result.confidence,
      citations,
      provenance: {
        sources:
          sources.length > 0
            ? sources
            : [{ name: 'zone_scores', count: result.components.available_count }],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: zoneId,
        fase_gentrificacion: result.components.fase_gentrificacion,
        tendencia_demografia: result.components.tendencia_demografia,
        tendencia_seguridad: result.components.tendencia_seguridad,
        narrativa_tipo: result.components.narrativa_tipo,
        price_delta_5y_pct: String(raw.price_index_zona_5y_delta_pct ?? 'n/a'),
      },
      valid_until,
    };
  },
};

export default h16NeighborhoodEvolutionCalculator;
