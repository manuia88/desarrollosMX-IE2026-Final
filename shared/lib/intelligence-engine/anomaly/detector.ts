// U11 + F3 — Anomaly detector con baseline rolling 30d.
// Ref: FASE 08 plan §BLOQUE 8.F prompt v8.
//
// Llamado desde runScore tras persist. Consulta score_history últimos 30d
// para mismo entity + score_type, calcula media + stddev, compara value
// actual. Si deviation > 3σ → INSERT market_anomalies + flag zone/project.

import type { SupabaseClient } from '@supabase/supabase-js';
import { hashUserIdForTelemetry } from '@/shared/lib/telemetry/hash-user-id';
import { posthog } from '@/shared/lib/telemetry/posthog';

const DEVIATION_THRESHOLD_SIGMA = 3;
const BASELINE_WINDOW_DAYS = 30;
const MIN_SAMPLES = 5;

export interface DetectionInput {
  readonly scoreId: string;
  readonly entityType: 'zone' | 'project' | 'user' | 'market';
  readonly entityId: string;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly currentValue: number;
}

export interface AnomalyMarker {
  readonly detected: boolean;
  readonly deviation_sigma: number;
  readonly baseline: number;
  readonly samples: number;
}

export interface DetectionResult {
  readonly marker: AnomalyMarker | null;
  readonly persisted: boolean;
}

export function computeBaselineStats(values: readonly number[]): {
  mean: number;
  stddev: number;
  samples: number;
} {
  const samples = values.length;
  if (samples === 0) return { mean: 0, stddev: 0, samples: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / samples;
  if (samples < 2) return { mean, stddev: 0, samples };
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (samples - 1);
  const stddev = Math.sqrt(variance);
  return { mean, stddev, samples };
}

export function shouldFlagAnomaly(
  current: number,
  baseline: { mean: number; stddev: number; samples: number },
): AnomalyMarker | null {
  if (baseline.samples < MIN_SAMPLES) return null;
  if (baseline.stddev === 0) return null;
  const deviation_sigma = Math.abs(current - baseline.mean) / baseline.stddev;
  const detected = deviation_sigma > DEVIATION_THRESHOLD_SIGMA;
  return {
    detected,
    deviation_sigma: Number(deviation_sigma.toFixed(2)),
    baseline: Number(baseline.mean.toFixed(2)),
    samples: baseline.samples,
  };
}

type LooseClient = SupabaseClient<Record<string, unknown>>;
function lax(s: SupabaseClient): LooseClient {
  return s as unknown as LooseClient;
}

async function fetchBaselineValues(
  supabase: SupabaseClient,
  input: DetectionInput,
  now: Date,
): Promise<number[]> {
  const windowStart = new Date(
    now.getTime() - BASELINE_WINDOW_DAYS * 24 * 3600 * 1000,
  ).toISOString();
  try {
    const { data } = await lax(supabase)
      .from('score_history')
      .select('score_value')
      .eq('entity_type', input.entityType)
      .eq('entity_id', input.entityId)
      .eq('score_type', input.scoreId)
      .gte('archived_at', windowStart)
      .limit(100);
    if (!Array.isArray(data)) return [];
    return (data as Array<{ score_value: number | string }>).map((r) =>
      typeof r.score_value === 'string' ? Number.parseFloat(r.score_value) : r.score_value,
    );
  } catch {
    return [];
  }
}

async function persistAnomaly(
  supabase: SupabaseClient,
  input: DetectionInput,
  marker: AnomalyMarker,
): Promise<boolean> {
  try {
    const row = {
      score_id: input.scoreId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      country_code: input.countryCode,
      period_date: input.periodDate,
      value_current: input.currentValue,
      value_baseline: marker.baseline,
      deviation_sigma: marker.deviation_sigma,
      baseline_samples_count: marker.samples,
    } as never;
    const { error } = await lax(supabase).from('market_anomalies').insert(row);
    if (error) return false;
  } catch {
    return false;
  }
  return true;
}

async function updateScoreAnomalyFlag(
  supabase: SupabaseClient,
  input: DetectionInput,
  marker: AnomalyMarker,
): Promise<void> {
  const table =
    input.entityType === 'zone'
      ? 'zone_scores'
      : input.entityType === 'project'
        ? 'project_scores'
        : null;
  if (!table) return;
  try {
    const idColumn = input.entityType === 'zone' ? 'zone_id' : 'project_id';
    const payload = { anomaly: marker } as never;
    await lax(supabase)
      .from(table)
      .update(payload)
      .eq(idColumn, input.entityId)
      .eq('score_type', input.scoreId)
      .eq('period_date', input.periodDate);
  } catch {
    // best-effort
  }
}

function emitPostHogAnomaly(input: DetectionInput, marker: AnomalyMarker): void {
  try {
    posthog.capture({
      distinctId: hashUserIdForTelemetry(input.entityId),
      event: 'ie.anomaly.detected',
      properties: {
        score_id: input.scoreId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        value_current: input.currentValue,
        baseline: marker.baseline,
        deviation_sigma: marker.deviation_sigma,
        samples: marker.samples,
      },
    });
  } catch {
    // telemetry best-effort
  }
}

export async function detectAndRecordAnomaly(
  supabase: SupabaseClient,
  input: DetectionInput,
): Promise<DetectionResult> {
  const values = await fetchBaselineValues(supabase, input, new Date());
  const stats = computeBaselineStats(values);
  const marker = shouldFlagAnomaly(input.currentValue, stats);
  if (!marker) return { marker: null, persisted: false };
  if (!marker.detected) {
    return { marker, persisted: false };
  }
  const persisted = await persistAnomaly(supabase, input, marker);
  await updateScoreAnomalyFlag(supabase, input, marker);
  emitPostHogAnomaly(input, marker);
  return { marker, persisted };
}
