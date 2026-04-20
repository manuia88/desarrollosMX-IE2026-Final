// D8 FASE 09 — weights loader runtime para N1 calculators.
// Lookup score_weights por (score_id, country_code) con cache 1h.
// Fallback: si no hay rows activas, calculator usa defaults hardcoded en methodology.

import type { SupabaseClient } from '@supabase/supabase-js';
import { cached } from '@/shared/lib/runtime-cache';

export type WeightsMap = Readonly<Record<string, number>>;

const WEIGHTS_TTL_SECONDS = 3600;

function weightsCacheKey(scoreId: string, countryCode: string): string {
  return `weights:${scoreId}:${countryCode}`;
}

export function weightsCacheTag(scoreId: string): string {
  return `weights:${scoreId}`;
}

export async function loadWeights(
  supabase: SupabaseClient,
  scoreId: string,
  countryCode: string,
): Promise<WeightsMap | null> {
  const key = weightsCacheKey(scoreId, countryCode);
  return cached(key, WEIGHTS_TTL_SECONDS, [weightsCacheTag(scoreId)], async () => {
    const lax = supabase as unknown as SupabaseClient<Record<string, unknown>>;
    const { data, error } = await lax
      .from('score_weights')
      .select('dimension_score_id, weight' as never)
      .eq('score_id' as never, scoreId)
      .eq('country_code' as never, countryCode)
      .is('valid_until' as never, null);
    if (error || !data) return null;
    const rows = data as unknown as ReadonlyArray<{ dimension_score_id: string; weight: number }>;
    if (rows.length === 0) return null;
    const map: Record<string, number> = {};
    for (const r of rows) map[r.dimension_score_id] = Number(r.weight);
    return map;
  });
}

// D9 — fallback graceful: re-normaliza weights cuando dependencies están missing.
// Si una dep no está disponible (insufficient_data), su weight se redistribuye
// proporcionalmente entre las deps disponibles. Retorna nueva WeightsMap + lista
// de dimensions descartadas (para components.missing_dimensions).
export interface RenormalizedWeights {
  readonly weights: WeightsMap;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
}

export function renormalizeWeights(
  base: WeightsMap,
  availableDimensions: readonly string[],
): RenormalizedWeights {
  const available = new Set(availableDimensions);
  const total = Object.keys(base).length;
  const missing: string[] = [];
  let available_sum = 0;
  for (const [dim, w] of Object.entries(base)) {
    if (!available.has(dim)) {
      missing.push(dim);
    } else {
      available_sum += w;
    }
  }
  if (available_sum === 0) {
    return {
      weights: {},
      missing_dimensions: missing,
      available_count: 0,
      total_count: total,
    };
  }
  const normalized: Record<string, number> = {};
  for (const [dim, w] of Object.entries(base)) {
    if (available.has(dim)) {
      normalized[dim] = w / available_sum;
    }
  }
  return {
    weights: normalized,
    missing_dimensions: missing,
    available_count: total - missing.length,
    total_count: total,
  };
}
