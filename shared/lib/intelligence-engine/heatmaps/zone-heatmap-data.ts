// L-72 FASE 10 SESIÓN 3/3 — heatmap data layer (FASE 12 Mapbox prep).
// Expone getHeatmapData(score_id, country_code, bbox?) → array de puntos
// para render en portal público (Mapbox Heatmap layer FASE 12).
//
// H1 scope: score_value + zone_id + country_code + confidence + period_date
// desde MV heatmap_cache (refresh daily 5am). Sin lat/lng nativo — el
// consumer FASE 12 resolverá coords por zone_id vía lookup zona geo table
// cuando aterrice (Mapbox vectors).
//
// Cache Runtime 1h per (score_id, country_code, bbox_hash) via Vercel
// Runtime Cache API (prep) — H1 aplica in-memory cache con TTL.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface HeatmapPoint {
  readonly score_id: string;
  readonly zone_id: string;
  readonly country_code: string;
  readonly value: number;
  readonly confidence: string;
  readonly period_date: string;
}

export interface HeatmapQueryParams {
  readonly score_id: string;
  readonly country_code: string;
  // BBox opcional [minLng, minLat, maxLng, maxLat] — aplica filter H2 cuando
  // zone geo table aterrice. H1 sin lat/lng → ignore silencioso.
  readonly bbox?: readonly [number, number, number, number];
}

const HEATMAP_CACHE = new Map<string, { data: readonly HeatmapPoint[]; expires_at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cacheKey(params: HeatmapQueryParams): string {
  const bboxKey = params.bbox ? params.bbox.join(',') : 'all';
  return `${params.score_id}:${params.country_code}:${bboxKey}`;
}

export async function getHeatmapData(
  supabase: SupabaseClient,
  params: HeatmapQueryParams,
): Promise<readonly HeatmapPoint[]> {
  const key = cacheKey(params);
  const now_ms = Date.now();
  const cached = HEATMAP_CACHE.get(key);
  if (cached && cached.expires_at > now_ms) return cached.data;

  try {
    const { data, error } = await (supabase as unknown as SupabaseClient)
      .from('heatmap_cache' as never)
      .select('score_id, zone_id, country_code, value, confidence, period_date')
      .eq('score_id' as never, params.score_id)
      .eq('country_code' as never, params.country_code);
    if (error || !data) return cached?.data ?? [];
    const rows = (data as unknown as Array<Record<string, unknown>>)
      .map((r): HeatmapPoint | null => {
        if (
          typeof r.score_id !== 'string' ||
          typeof r.zone_id !== 'string' ||
          typeof r.country_code !== 'string' ||
          typeof r.value !== 'number' ||
          typeof r.confidence !== 'string' ||
          typeof r.period_date !== 'string'
        ) {
          return null;
        }
        return {
          score_id: r.score_id,
          zone_id: r.zone_id,
          country_code: r.country_code,
          value: r.value,
          confidence: r.confidence,
          period_date: r.period_date,
        };
      })
      .filter((r): r is HeatmapPoint => r !== null);
    HEATMAP_CACHE.set(key, { data: rows, expires_at: now_ms + CACHE_TTL_MS });
    return rows;
  } catch {
    return cached?.data ?? [];
  }
}

// Helper para tests — reset cache.
export function clearHeatmapCacheForTesting(): void {
  HEATMAP_CACHE.clear();
}
