// Helper U8 — cached query geo_data_points para calculators N0.
// Reemplaza supabase.from('geo_data_points').select() directo cuando el
// calculator re-ejecuta por mismo zone+source+period dentro de 24h
// (worker cron re-tick scenarios + cascades batch).
//
// Uso en calculators F01, F02, F03, F05, H01, H02:
//   const points = await fetchGeoDataPointsCached(supabase, {
//     source: 'fgj', zoneId: input.zoneId!, periodStart, periodEnd, radiusKm: 1.5,
//   });

import type { SupabaseClient } from '@supabase/supabase-js';
import { cached, geoCacheKey, geoCacheTag } from '@/shared/lib/runtime-cache';

const DEFAULT_TTL_SECONDS = 24 * 3600;

export interface GeoQueryArgs {
  readonly source: string;
  readonly zoneId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly radiusKm: number;
}

export interface GeoDataRow {
  readonly id: string;
  readonly source: string;
  readonly source_id: string;
  readonly period_date: string;
  readonly metadata: Record<string, unknown> | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;
function lax(s: SupabaseClient): LooseClient {
  return s as unknown as LooseClient;
}

export async function fetchGeoDataPointsCached(
  supabase: SupabaseClient,
  args: GeoQueryArgs,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<readonly GeoDataRow[]> {
  const key = geoCacheKey({
    source: args.source,
    zoneId: args.zoneId,
    period: `${args.periodStart}_${args.periodEnd}`,
    radiusKm: args.radiusKm,
  });
  return cached(key, ttlSeconds, [geoCacheTag(args.source)], async () => {
    const { data } = await lax(supabase)
      .from('geo_data_points')
      .select('id, source, source_id, period_date, metadata, latitude, longitude')
      .eq('source', args.source)
      .gte('period_date', args.periodStart)
      .lte('period_date', args.periodEnd);
    return (data as GeoDataRow[] | null) ?? [];
  });
}
