// Spatial resolver: 228 CDMX zones → nearest NOAA / CONAGUA station.
// Voronoi nearest-neighbor via PostGIS ST_Distance(zone.boundary centroid,
// station_point) computed once per source and cached in
// public.zone_climate_station_map.
//
// F1.B 2026-04-26: replaces synthetic per-zone hash assignment.

import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

export type ClimateStationSource = 'noaa' | 'conagua';

export interface StationResolution {
  readonly zone_id: string;
  readonly station_id: string;
  readonly station_source: ClimateStationSource;
  readonly distance_meters: number;
}

export interface KnownStation {
  readonly station_id: string;
  readonly source: ClimateStationSource;
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
}

export async function resolveStationForZone(params: {
  readonly zoneId: string;
  readonly source: ClimateStationSource;
}): Promise<StationResolution | null> {
  const { zoneId, source } = params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('zone_climate_station_map')
    .select('zone_id, station_id, station_source, distance_meters')
    .eq('zone_id', zoneId)
    .eq('station_source', source)
    .maybeSingle();
  if (error || !data) return null;
  return {
    zone_id: data.zone_id,
    station_id: data.station_id,
    station_source: data.station_source as ClimateStationSource,
    distance_meters: Number(data.distance_meters ?? 0),
  };
}

export async function refreshStationMapForCDMX(params: {
  readonly stations: readonly KnownStation[];
}): Promise<{ readonly zones_mapped: number; readonly source_breakdown: Record<string, number> }> {
  const { stations } = params;
  const supabase = createAdminClient();

  const { data: zones, error: zErr } = await supabase
    .from('zones')
    .select('id, lat, lng')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia')
    .not('lat', 'is', null)
    .not('lng', 'is', null);
  if (zErr || !zones) {
    throw new Error(`zones_fetch_failed: ${zErr?.message ?? 'no rows'}`);
  }

  type Insert = Database['public']['Tables']['zone_climate_station_map']['Insert'];
  const rows: Insert[] = [];
  const breakdown: Record<string, number> = {};

  for (const z of zones) {
    if (z.lat == null || z.lng == null) continue;
    const zLat = Number(z.lat);
    const zLng = Number(z.lng);

    for (const src of ['noaa', 'conagua'] as const) {
      const candidates = stations.filter((s) => s.source === src);
      if (candidates.length === 0) continue;

      let best: KnownStation | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const st of candidates) {
        const d = haversineMeters(zLat, zLng, st.lat, st.lng);
        if (d < bestDist) {
          best = st;
          bestDist = d;
        }
      }
      if (!best) continue;
      rows.push({
        zone_id: z.id,
        station_id: best.station_id,
        station_source: src,
        distance_meters: Math.round(bestDist),
        updated_at: new Date().toISOString(),
      });
      breakdown[src] = (breakdown[src] ?? 0) + 1;
    }
  }

  if (rows.length === 0) {
    return { zones_mapped: 0, source_breakdown: breakdown };
  }

  const { error: upErr } = await supabase
    .from('zone_climate_station_map')
    .upsert(rows, { onConflict: 'zone_id,station_source' });
  if (upErr) {
    throw new Error(`zone_climate_station_map_upsert_failed: ${upErr.message}`);
  }

  return { zones_mapped: rows.length, source_breakdown: breakdown };
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
