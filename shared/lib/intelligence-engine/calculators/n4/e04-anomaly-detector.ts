// E04 Anomaly Detector — score N4 categoría 'mercado' que detecta anomalías
// combinando z-scores de deltas (precio, F08, búsquedas) contra baselines
// rolling 30d. Complementa anomaly/detector.ts existente.
// Plan FASE 10 §10.C.E04. Catálogo 03.8 §E04. Tier 3.
//
// Formula:
//   z_score_i = (current_delta_i − rolling_mean_30d_i) / rolling_stddev_30d_i
//   anomaly_score = max(|z_score_i|) across [delta_price, delta_F08, delta_search]
//   value = 100 − normalized_anomaly_score  (100 = estable, 0 = alta anomalía)
//
// Severity thresholds: |z|>3 alta, |z|>2 moderada, |z|>1.5 leve, ≤1.5 estable.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const THRESHOLD_HIGH_SIGMA = 3;
export const THRESHOLD_MEDIUM_SIGMA = 2;
export const THRESHOLD_LOW_SIGMA = 1.5;
export const MIN_SAMPLES = 5;
export const BASELINE_WINDOW_DAYS = 30;

export type AnomalySeverity = 'estable' | 'leve' | 'moderada' | 'alta';
export type AnomalyTrigger = 'price' | 'score' | 'search';

export const methodology = {
  formula:
    'anomaly_score = max(|z_score|) sobre [delta_price, delta_F08, delta_search_volume]. z = (curr − mean_30d) / stddev_30d. value = 100 − normalized(anomaly_score).',
  sources: [
    'price_snapshots',
    'zone_scores:F08',
    'zone_scores_history',
    'search_logs',
    'score_history',
  ],
  dependencies: [
    { score_id: 'F08', weight: 0.33, role: 'livability_delta', critical: true },
    { score_id: 'A12', weight: 0.33, role: 'market_velocity_ref', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §E04 Anomaly Detector',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#e04-anomaly-detector',
    },
    { name: 'Plan FASE 10 §10.C.E04', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
    {
      name: 'anomaly/detector.ts — rolling baseline existente',
      url: 'shared/lib/intelligence-engine/anomaly/detector.ts',
    },
  ],
  validity: { unit: 'hours', value: 24 } as const,
  confidence_thresholds: { min_samples: MIN_SAMPLES, high_samples: 20 },
  sensitivity_analysis: [
    { dimension_id: 'delta_price', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'delta_F08', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'delta_search_volume', impact_pct_per_10pct_change: 2.0 },
  ],
  severity_thresholds: {
    alta: THRESHOLD_HIGH_SIGMA,
    moderada: THRESHOLD_MEDIUM_SIGMA,
    leve: THRESHOLD_LOW_SIGMA,
  },
  baseline_window_days: BASELINE_WINDOW_DAYS,
} as const;

export const reasoning_template =
  'Anomaly Detector zona {zone_id}: {score_value}/100. Severity {severity}. Triggered alerts: {triggered_alerts}. Max |z|={max_abs_z}.';

export type AnomalyMetric = 'delta_price' | 'delta_F08' | 'delta_search_volume';

export interface RollingStats {
  readonly mean: number;
  readonly stddev: number;
  readonly samples: number;
}

export interface E04RawInput {
  readonly current_deltas: Readonly<Record<AnomalyMetric, number | null>>;
  readonly baselines: Readonly<Record<AnomalyMetric, RollingStats | null>>;
  // Opcional: breakdown de entities para drill-down (ej. qué proyectos
  // dentro de la zona aportan al anomaly). Sensitive — interno.
  readonly entity_list_breakdown?: readonly {
    readonly entity_id: string;
    readonly contribution: number;
  }[];
}

export interface E04Components extends Record<string, unknown> {
  readonly z_scores_by_metric: Readonly<Record<AnomalyMetric, number | null>>;
  readonly raw_deltas: Readonly<Record<AnomalyMetric, number | null>>;
  readonly entity_list_breakdown: readonly {
    readonly entity_id: string;
    readonly contribution: number;
  }[];
  readonly triggered_alerts: readonly AnomalyTrigger[];
  readonly anomaly_severity: AnomalySeverity;
  readonly max_abs_z: number;
  readonly samples_used: number;
}

export interface E04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: E04Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeRollingStats(values: readonly number[]): RollingStats {
  const samples = values.length;
  if (samples === 0) return { mean: 0, stddev: 0, samples: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / samples;
  if (samples < 2) return { mean, stddev: 0, samples };
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (samples - 1);
  const stddev = Math.sqrt(variance);
  return {
    mean: Number(mean.toFixed(4)),
    stddev: Number(stddev.toFixed(4)),
    samples,
  };
}

export function zScore(current: number, stats: RollingStats): number | null {
  if (stats.samples < MIN_SAMPLES) return null;
  if (stats.stddev === 0) return null;
  return Number(((current - stats.mean) / stats.stddev).toFixed(4));
}

function severityFromMaxAbsZ(maxAbsZ: number): AnomalySeverity {
  if (maxAbsZ > THRESHOLD_HIGH_SIGMA) return 'alta';
  if (maxAbsZ > THRESHOLD_MEDIUM_SIGMA) return 'moderada';
  if (maxAbsZ > THRESHOLD_LOW_SIGMA) return 'leve';
  return 'estable';
}

const METRIC_TO_TRIGGER: Readonly<Record<AnomalyMetric, AnomalyTrigger>> = {
  delta_price: 'price',
  delta_F08: 'score',
  delta_search_volume: 'search',
};

export function computeE04AnomalyDetector(input: E04RawInput): E04ComputeResult {
  const metrics: readonly AnomalyMetric[] = ['delta_price', 'delta_F08', 'delta_search_volume'];
  const z_scores_by_metric: Record<AnomalyMetric, number | null> = {
    delta_price: null,
    delta_F08: null,
    delta_search_volume: null,
  };
  const raw_deltas: Record<AnomalyMetric, number | null> = {
    delta_price: null,
    delta_F08: null,
    delta_search_volume: null,
  };

  let max_abs_z = 0;
  let samples_used = 0;
  const triggered_alerts: AnomalyTrigger[] = [];
  let valid_metrics = 0;

  for (const metric of metrics) {
    const current = input.current_deltas[metric];
    const stats = input.baselines[metric];
    raw_deltas[metric] = current;

    if (current === null || current === undefined || !Number.isFinite(current) || !stats) {
      continue;
    }

    const z = zScore(current, stats);
    if (z === null) {
      continue;
    }

    z_scores_by_metric[metric] = z;
    valid_metrics += 1;
    samples_used = Math.max(samples_used, stats.samples);

    const absZ = Math.abs(z);
    if (absZ > max_abs_z) max_abs_z = absZ;

    if (absZ > THRESHOLD_LOW_SIGMA) {
      const trigger = METRIC_TO_TRIGGER[metric];
      if (!triggered_alerts.includes(trigger)) triggered_alerts.push(trigger);
    }
  }

  if (valid_metrics === 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        z_scores_by_metric,
        raw_deltas,
        entity_list_breakdown: input.entity_list_breakdown ?? [],
        triggered_alerts: [],
        anomaly_severity: 'estable',
        max_abs_z: 0,
        samples_used,
      },
    };
  }

  const anomaly_severity = severityFromMaxAbsZ(max_abs_z);
  // Normalize max_abs_z a escala 0-100 usando 3σ como techo superior (=100 penalty).
  const normalized_anomaly = Math.min(100, (max_abs_z / THRESHOLD_HIGH_SIGMA) * 100);
  const value = Math.round(clamp100(100 - normalized_anomaly));

  const confidence: Confidence =
    samples_used >= methodology.confidence_thresholds.high_samples
      ? 'high'
      : samples_used >= MIN_SAMPLES
        ? 'medium'
        : 'low';

  return {
    value,
    confidence,
    components: {
      z_scores_by_metric,
      raw_deltas,
      entity_list_breakdown: input.entity_list_breakdown ?? [],
      triggered_alerts,
      anomaly_severity,
      max_abs_z: Number(max_abs_z.toFixed(4)),
      samples_used,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.e04.insufficient';
  if (value >= 80) return 'ie.score.e04.estable';
  if (value >= 60) return 'ie.score.e04.leve';
  if (value >= 40) return 'ie.score.e04.moderada';
  return 'ie.score.e04.alta';
}

export const e04AnomalyDetectorCalculator: Calculator = {
  scoreId: 'E04',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeE04AnomalyDetector directo',
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId ?? null,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'price_snapshots', period: input.periodDate },
        { source: 'zone_scores:F08', period: input.periodDate },
        { source: 'score_history', period: input.periodDate },
        { source: 'search_logs', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'price_snapshots', count: 0 },
          { name: 'zone_scores:F08', count: 0 },
          { name: 'score_history', count: 0 },
          { name: 'search_logs', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId ?? 'desconocido',
        severity: 'estable',
        triggered_alerts: '',
        max_abs_z: 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default e04AnomalyDetectorCalculator;
