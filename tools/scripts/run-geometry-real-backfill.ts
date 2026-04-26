// Geometry Real Backfill — F1.D 2026-04-26.
//
// Replaces synthetic bbox-500m uniform polygons in zones.boundary with real
// MGN polygons fetched from datos.cdmx.gob.mx CKAN (1814 colonias features).
//
// Run order:
//   1. Fetch GeoJSON FeatureCollection from CDMX CKAN (~3 MB).
//   2. Build normalized name → feature index (UPPERCASE + remove accents +
//      strip parenthetical suffixes).
//   3. Iterate 210 zones (scope_type='colonia', country_code='MX'):
//        - Normalize zones.name_es
//        - Match against GeoJSON NOMUT
//        - If match: compute centroid + area_km2 from polygon
//        - Invoke RPC update_zone_boundary_from_geojson(...)
//   4. Re-trigger zone_climate_station_map refresh (centroids changed).
//   5. Re-invoke recompute_climate_aggregates_from_observations (station map
//      may have re-assigned zones to closer stations).
//   6. Print matched / unmatched / errors breakdown.
//
// Idempotent: RPC is UPDATE-only; running twice yields same final state.
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Load via shell: `set -a; source .env.local; set +a` before invoking.
//
// Run via:
//   node --experimental-strip-types --experimental-transform-types \
//     --import=./scripts/compute/_register-ts-loader.mjs \
//     tools/scripts/run-geometry-real-backfill.ts

import { CONAGUA_CDMX_KNOWN_STATIONS } from '@/shared/lib/ingest/climate/conagua-smn';
import { NOAA_CDMX_KNOWN_STATIONS } from '@/shared/lib/ingest/climate/noaa';
import { refreshStationMapForCDMX } from '@/shared/lib/ingest/climate/spatial-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const GEOJSON_URL =
  'https://datos.cdmx.gob.mx/dataset/04a1900a-0c2f-41ed-94dc-3d2d5bad4065/resource/8070ee81-9111-437e-a3dd-0c3cc6dce9f4/download/colonias-cdmx-.json';

interface GeoFeature {
  readonly type: 'Feature';
  readonly geometry: {
    readonly type: 'Polygon' | 'MultiPolygon';
    readonly coordinates: number[][][] | number[][][][];
  };
  readonly properties: Record<string, unknown>;
}

interface GeoFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: GeoFeature[];
}

function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toUpperCase()
    .replace(/\([^)]*\)/g, '') // strip parenthetical suffixes
    .replace(/\s+/g, ' ')
    .trim();
}

function isMultiPolygon(coords: number[][][] | number[][][][]): coords is number[][][][] {
  const first = coords[0];
  if (!first) return false;
  const second = (first as number[][][])[0];
  if (!second) return false;
  return Array.isArray(second[0]);
}

function computePolygonAreaKm2(coords: number[][][] | number[][][][]): number {
  const R = 6371;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const ringArea = (ring: number[][]): number => {
    let total = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      if (!a || !b || a.length < 2 || b.length < 2) continue;
      const lng1 = a[0] as number;
      const lat1 = a[1] as number;
      const lng2 = b[0] as number;
      const lat2 = b[1] as number;
      total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
    }
    return Math.abs((total * R * R) / 2);
  };
  if (isMultiPolygon(coords)) {
    return coords.reduce((sum, poly) => {
      const outer = poly[0];
      return outer ? sum + ringArea(outer) : sum;
    }, 0);
  }
  const outer = coords[0];
  return outer ? ringArea(outer) : 0;
}

function computeCentroid(coords: number[][][] | number[][][][]): { lat: number; lng: number } {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  const visit = (lng: number, lat: number): void => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  };
  const visitRing = (ring: number[][]): void => {
    for (const point of ring) {
      if (point.length >= 2) {
        visit(point[0] as number, point[1] as number);
      }
    }
  };
  if (isMultiPolygon(coords)) {
    for (const poly of coords) {
      for (const ring of poly) visitRing(ring);
    }
  } else {
    for (const ring of coords) visitRing(ring);
  }
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
}

async function main(): Promise<void> {
  const start = Date.now();
  console.info('[geometry-backfill] step 1/5 fetch GeoJSON CDMX colonias');
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`geojson_fetch_failed: ${res.status}`);
  const fc = (await res.json()) as GeoFeatureCollection;
  console.info(`[geometry-backfill] received ${fc.features.length} features`);

  console.info('[geometry-backfill] step 2/5 build normalized name index');
  const byName = new Map<string, GeoFeature>();
  for (const feat of fc.features) {
    const nomut = (feat.properties.NOMUT as string | undefined) ?? '';
    const norm = normalizeName(nomut);
    if (!byName.has(norm)) byName.set(norm, feat);
  }
  console.info(`[geometry-backfill] indexed ${byName.size} unique normalized names`);

  console.info('[geometry-backfill] step 3/5 update zones.boundary via RPC');
  const supabase = createAdminClient();
  const { data: zones, error: zErr } = await supabase
    .from('zones')
    .select('id, name_es')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia');
  if (zErr || !zones) throw new Error(`zones_fetch_failed: ${zErr?.message ?? 'no rows'}`);

  let matched = 0;
  let unmatched = 0;
  let errors = 0;
  const unmatchedNames: string[] = [];
  for (const z of zones) {
    if (!z.name_es) {
      unmatched++;
      continue;
    }
    const norm = normalizeName(z.name_es);
    const feat = byName.get(norm);
    if (!feat) {
      unmatched++;
      unmatchedNames.push(z.name_es);
      continue;
    }
    const areaKm2 = computePolygonAreaKm2(feat.geometry.coordinates);
    const centroid = computeCentroid(feat.geometry.coordinates);
    // zones.boundary column type is MultiPolygon — wrap Polygon for compat
    const geomForDb =
      feat.geometry.type === 'Polygon'
        ? { type: 'MultiPolygon', coordinates: [feat.geometry.coordinates] }
        : feat.geometry;
    const geojsonText = JSON.stringify(geomForDb);
    const { error: rpcErr } = await supabase.rpc('update_zone_boundary_from_geojson', {
      p_zone_id: z.id,
      p_geojson_text: geojsonText,
      p_area_km2: areaKm2,
      p_lat_centroid: centroid.lat,
      p_lng_centroid: centroid.lng,
    });
    if (rpcErr) {
      errors++;
      console.error(`[geometry-backfill] rpc error zone ${z.name_es}: ${rpcErr.message}`);
    } else {
      matched++;
    }
  }
  console.info(
    `[geometry-backfill] zone updates: matched=${matched} unmatched=${unmatched} errors=${errors}`,
  );
  if (unmatchedNames.length > 0 && unmatchedNames.length <= 50) {
    console.info('[geometry-backfill] sample unmatched names:', unmatchedNames.slice(0, 20));
  }

  console.info('[geometry-backfill] step 4/5 refresh zone_climate_station_map (centroids changed)');
  const stations = [...NOAA_CDMX_KNOWN_STATIONS, ...CONAGUA_CDMX_KNOWN_STATIONS];
  const mapResult = await refreshStationMapForCDMX({ stations });
  console.info(
    `[geometry-backfill] re-mapped ${mapResult.zones_mapped} pairs`,
    mapResult.source_breakdown,
  );

  console.info('[geometry-backfill] step 5/5 re-invoke climate recompute');
  const { data: rcStats, error: rcErr } = await supabase.rpc(
    'recompute_climate_aggregates_from_observations',
  );
  if (rcErr) {
    console.error('[geometry-backfill] recompute error:', rcErr.message);
  } else {
    console.info('[geometry-backfill] recompute stats', rcStats);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.info(`[geometry-backfill] done in ${elapsed}s`);
}

main().catch((e) => {
  console.error('[geometry-backfill] fatal', e);
  process.exit(1);
});
