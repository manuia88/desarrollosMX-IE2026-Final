// F10 Gentrification 2.0 — score N2 que consolida N03 Velocity + N04 Crime
// Trajectory + N01 Diversity Δ + A04 Arbitrage + delta price_index 12m.
// Plan FASE 10 §10.A.2. Catálogo 03.8 §F10.
//
// Fórmula:
//   composite = 0.30·N03 + 0.20·(100 − N04) + 0.20·|ΔN01|·10 + 0.15·A04 + 0.15·precio_delta_12m_signal
//   - (100 − N04): invertimos — trayectoria criminal "mejorando" suma a gentrificación.
//   - |ΔN01|·10: cambio en diversidad de giros escalado a 0-100 (saturado).
//   - precio_delta_12m_signal = clamp(precio_delta_pct × 500, 0, 100)  (+20% → 100).
//
// Clasificación fase gentrificación (components.fase_gentrificacion):
//   composite <30  → 'inicial'
//   30-55          → 'media'
//   55-75          → 'tardia'
//   >=75           → 'post_gentrificada'
//
// D13 — critical dep: N03 (velocity). Sin N03 válido → insufficient_data.
// Supporting: N04, N01, A04, precio_delta (degradan confidence).
//
// Tier 3 (requiere snapshots históricos: delta price_index 12m + ΔN01).

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectDepConfidences, propagateConfidence } from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type F10Phase = 'inicial' | 'media' | 'tardia' | 'post_gentrificada' | 'insufficient';

export const DEFAULT_WEIGHTS = {
  N03: 0.3,
  N04_inv: 0.2,
  N01_delta: 0.2,
  A04: 0.15,
  price_delta_12m: 0.15,
} as const;

export const PRICE_DELTA_SCALE = 500; // +20% → 100
export const N01_DELTA_SCALE = 10; // Δ=10 → 100 (saturado)

export const methodology = {
  formula:
    'composite = 0.30·N03 + 0.20·(100−N04) + 0.20·min(|ΔN01|·10,100) + 0.15·A04 + 0.15·clamp(precio_delta_12m·500,0,100).',
  sources: [
    'zone_scores:N03',
    'zone_scores:N04',
    'zone_scores:N01',
    'zone_scores:A04',
    'market_prices_secondary',
  ],
  weights: DEFAULT_WEIGHTS,
  dependencies: [
    { score_id: 'N03', weight: 0.3, role: 'velocity_cambio_socioeconomico', critical: true },
    { score_id: 'N04', weight: 0.2, role: 'trayectoria_criminal', critical: false },
    { score_id: 'N01', weight: 0.2, role: 'diversidad_giros_delta', critical: false },
    { score_id: 'A04', weight: 0.15, role: 'arbitraje_precios', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §F10 Gentrification 2.0',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#f10-gentrification-2',
    },
    {
      name: 'Plan FASE 10 §10.A.2',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 60,
    high_coverage_pct: 100,
  },
  sensitivity_analysis: {
    most_sensitive_input: 'N03_velocity',
    impact_notes: [
      'N03±10 mueve composite ±3 puntos — dep crítica, cap techo confianza.',
      'precio_delta_12m +10% → +75 signal (capped 100) — empuja fase a tardía/post.',
      '|ΔN01|≥10 satura a 100 en el componente diversidad (evita sesgo en barrios con cambio violento de giros).',
      'N04 invertido: mejora de trayectoria criminal suma; deterioro resta.',
    ],
  },
} as const;

export const reasoning_template =
  'Gentrificación 2.0 en {zona_name}: fase {fase_gentrificacion} (composite={score_value}). Drivers: velocidad N03={N03}, trayectoria criminal N04={N04}, diversidad ΔN01={N01_delta}, arbitraje A04={A04}, precio 12m {price_delta_12m_pct}%. Confianza {confidence}.';

export interface F10Driver {
  readonly factor: string;
  readonly contribution_pct: number;
}

export interface F10Components extends Record<string, unknown> {
  readonly fase_gentrificacion: F10Phase;
  readonly composite: number;
  readonly subscores: Readonly<{
    N03: number | null;
    N04: number | null;
    N01_delta: number | null;
    A04: number | null;
    price_delta_12m_pct: number | null;
  }>;
  readonly signals: Readonly<{
    n04_inverted: number | null;
    n01_delta_scaled: number | null;
    price_signal: number | null;
  }>;
  readonly drivers: readonly F10Driver[];
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
  readonly coverage_pct: number;
  readonly cap_reason: string | null;
  readonly capped_by: readonly string[];
}

export interface F10RawInput {
  readonly N03_velocity: number | null;
  readonly N04_crime_trajectory: number | null;
  readonly N01_diversity_delta: number | null;
  readonly A04_arbitrage: number | null;
  readonly price_index_zona_12m_delta_pct: number | null;
  readonly confidences?: {
    readonly N03?: Confidence;
    readonly N04?: Confidence;
    readonly N01?: Confidence;
    readonly A04?: Confidence;
  };
}

export interface F10ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F10Components;
}

const CRITICAL_DEPS: readonly string[] = ['N03'];
const TOTAL_DEPS = 5;

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function phaseFor(composite: number): F10Phase {
  if (composite >= 75) return 'post_gentrificada';
  if (composite >= 55) return 'tardia';
  if (composite >= 30) return 'media';
  return 'inicial';
}

export function computeF10Gentrification2(input: F10RawInput): F10ComputeResult {
  const missing: string[] = [];
  const has = {
    N03: input.N03_velocity !== null && Number.isFinite(input.N03_velocity),
    N04: input.N04_crime_trajectory !== null && Number.isFinite(input.N04_crime_trajectory),
    N01_delta: input.N01_diversity_delta !== null && Number.isFinite(input.N01_diversity_delta),
    A04: input.A04_arbitrage !== null && Number.isFinite(input.A04_arbitrage),
    price:
      input.price_index_zona_12m_delta_pct !== null &&
      Number.isFinite(input.price_index_zona_12m_delta_pct),
  };
  if (!has.N03) missing.push('N03');
  if (!has.N04) missing.push('N04');
  if (!has.N01_delta) missing.push('N01');
  if (!has.A04) missing.push('A04');
  if (!has.price) missing.push('price_delta_12m');

  const available_count = TOTAL_DEPS - missing.length;
  const coverage_pct = Math.round((available_count / TOTAL_DEPS) * 100);

  // Critical dep missing (N03) → insufficient.
  if (!has.N03) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        fase_gentrificacion: 'insufficient',
        composite: 0,
        subscores: {
          N03: input.N03_velocity,
          N04: input.N04_crime_trajectory,
          N01_delta: input.N01_diversity_delta,
          A04: input.A04_arbitrage,
          price_delta_12m_pct: input.price_index_zona_12m_delta_pct,
        },
        signals: { n04_inverted: null, n01_delta_scaled: null, price_signal: null },
        drivers: [],
        weights_applied: {},
        missing_dimensions: missing,
        available_count,
        total_count: TOTAL_DEPS,
        coverage_pct,
        cap_reason: 'critical_dependency_missing',
        capped_by: ['N03'],
      },
    };
  }

  const n03 = input.N03_velocity as number;
  const n04Inv = has.N04 ? 100 - (input.N04_crime_trajectory as number) : null;
  const n01DeltaScaled = has.N01_delta
    ? Math.min(100, Math.abs(input.N01_diversity_delta as number) * N01_DELTA_SCALE)
    : null;
  const a04 = has.A04 ? (input.A04_arbitrage as number) : null;
  const priceSignal = has.price
    ? clamp100((input.price_index_zona_12m_delta_pct as number) * PRICE_DELTA_SCALE)
    : null;

  // Renormalize weights over available dims.
  const baseWeights = {
    N03: DEFAULT_WEIGHTS.N03,
    N04_inv: has.N04 ? DEFAULT_WEIGHTS.N04_inv : 0,
    N01_delta: has.N01_delta ? DEFAULT_WEIGHTS.N01_delta : 0,
    A04: has.A04 ? DEFAULT_WEIGHTS.A04 : 0,
    price_delta_12m: has.price ? DEFAULT_WEIGHTS.price_delta_12m : 0,
  };
  const sumW =
    baseWeights.N03 +
    baseWeights.N04_inv +
    baseWeights.N01_delta +
    baseWeights.A04 +
    baseWeights.price_delta_12m;
  const norm = (v: number): number => (sumW > 0 ? Number((v / sumW).toFixed(4)) : 0);
  const weights = {
    N03: norm(baseWeights.N03),
    N04_inv: norm(baseWeights.N04_inv),
    N01_delta: norm(baseWeights.N01_delta),
    A04: norm(baseWeights.A04),
    price_delta_12m: norm(baseWeights.price_delta_12m),
  };

  const composite = clamp100(
    n03 * weights.N03 +
      (n04Inv ?? 0) * weights.N04_inv +
      (n01DeltaScaled ?? 0) * weights.N01_delta +
      (a04 ?? 0) * weights.A04 +
      (priceSignal ?? 0) * weights.price_delta_12m,
  );
  const value = Math.round(composite);
  const fase = phaseFor(value);

  const drivers: F10Driver[] = [];
  const contribTotal = composite > 0 ? composite : 1;
  if (weights.N03 > 0) {
    drivers.push({
      factor: 'N03_velocity',
      contribution_pct: Number((((n03 * weights.N03) / contribTotal) * 100).toFixed(1)),
    });
  }
  if (weights.N04_inv > 0 && n04Inv !== null) {
    drivers.push({
      factor: 'N04_crime_trajectory_inv',
      contribution_pct: Number((((n04Inv * weights.N04_inv) / contribTotal) * 100).toFixed(1)),
    });
  }
  if (weights.N01_delta > 0 && n01DeltaScaled !== null) {
    drivers.push({
      factor: 'N01_diversity_delta',
      contribution_pct: Number(
        (((n01DeltaScaled * weights.N01_delta) / contribTotal) * 100).toFixed(1),
      ),
    });
  }
  if (weights.A04 > 0 && a04 !== null) {
    drivers.push({
      factor: 'A04_arbitrage',
      contribution_pct: Number((((a04 * weights.A04) / contribTotal) * 100).toFixed(1)),
    });
  }
  if (weights.price_delta_12m > 0 && priceSignal !== null) {
    drivers.push({
      factor: 'price_delta_12m',
      contribution_pct: Number(
        (((priceSignal * weights.price_delta_12m) / contribTotal) * 100).toFixed(1),
      ),
    });
  }

  // Confidence propagation (D13).
  const depConfs: Array<{ scoreId: string; confidence: Confidence }> = [
    { scoreId: 'N03', confidence: input.confidences?.N03 ?? 'medium' },
  ];
  if (has.N04) depConfs.push({ scoreId: 'N04', confidence: input.confidences?.N04 ?? 'medium' });
  if (has.N01_delta)
    depConfs.push({ scoreId: 'N01', confidence: input.confidences?.N01 ?? 'medium' });
  if (has.A04) depConfs.push({ scoreId: 'A04', confidence: input.confidences?.A04 ?? 'medium' });

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
      composite: Number(composite.toFixed(2)),
      subscores: {
        N03: input.N03_velocity,
        N04: input.N04_crime_trajectory,
        N01_delta: input.N01_diversity_delta,
        A04: input.A04_arbitrage,
        price_delta_12m_pct: input.price_index_zona_12m_delta_pct,
      },
      signals: {
        n04_inverted: n04Inv,
        n01_delta_scaled: n01DeltaScaled,
        price_signal: priceSignal,
      },
      drivers,
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
  if (confidence === 'insufficient_data') return 'ie.score.f10.insufficient';
  if (value >= 75) return 'ie.score.f10.post_gentrificada';
  if (value >= 55) return 'ie.score.f10.tardia';
  if (value >= 30) return 'ie.score.f10.media';
  return 'ie.score.f10.inicial';
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
  input: F10RawInput;
  sources: Array<{ name: string; count: number }>;
}> {
  const input: {
    N03_velocity: number | null;
    N04_crime_trajectory: number | null;
    N01_diversity_delta: number | null;
    A04_arbitrage: number | null;
    price_index_zona_12m_delta_pct: number | null;
    confidences: {
      N03?: Confidence;
      N04?: Confidence;
      N01?: Confidence;
      A04?: Confidence;
    };
  } = {
    N03_velocity: null,
    N04_crime_trajectory: null,
    N01_diversity_delta: null,
    A04_arbitrage: null,
    price_index_zona_12m_delta_pct: null,
    confidences: {},
  };
  const sources: Array<{ name: string; count: number }> = [];

  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_type, score_value, confidence, components')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', ['N03', 'N04', 'N01', 'A04']);
    if (data) {
      const rows = data as unknown as readonly ZoneScoreRow[];
      for (const row of rows) {
        if (row.score_type === 'N03' && row.score_value !== null) {
          input.N03_velocity = row.score_value;
          if (row.confidence) input.confidences.N03 = row.confidence;
          sources.push({ name: 'zone_scores:N03', count: 1 });
        } else if (row.score_type === 'N04' && row.score_value !== null) {
          input.N04_crime_trajectory = row.score_value;
          if (row.confidence) input.confidences.N04 = row.confidence;
          sources.push({ name: 'zone_scores:N04', count: 1 });
        } else if (row.score_type === 'N01') {
          const comp = row.components as { delta_12m?: number } | null;
          if (comp && typeof comp.delta_12m === 'number') {
            input.N01_diversity_delta = comp.delta_12m;
            if (row.confidence) input.confidences.N01 = row.confidence;
            sources.push({ name: 'zone_scores:N01', count: 1 });
          }
        } else if (row.score_type === 'A04' && row.score_value !== null) {
          input.A04_arbitrage = row.score_value;
          if (row.confidence) input.confidences.A04 = row.confidence;
          sources.push({ name: 'zone_scores:A04', count: 1 });
        }
      }
    }
  } catch {
    // swallow
  }

  return { input, sources };
}

export const f10Gentrification2Calculator: Calculator = {
  scoreId: 'F10',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const valid_until = computeValidUntil(new Date(computed_at), methodology.validity);
    const zoneId = input.zoneId;
    if (!zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: { reason: 'F10 requiere zoneId.' },
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
    const result = computeF10Gentrification2(raw);

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
        N03: String(raw.N03_velocity ?? 'n/a'),
        N04: String(raw.N04_crime_trajectory ?? 'n/a'),
        N01_delta: String(raw.N01_diversity_delta ?? 'n/a'),
        A04: String(raw.A04_arbitrage ?? 'n/a'),
        price_delta_12m_pct: String(raw.price_index_zona_12m_delta_pct ?? 'n/a'),
      },
      valid_until,
    };
  },
};

export default f10Gentrification2Calculator;
