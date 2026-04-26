// F1.C.C Tier 2 Demographics — AGEB spatial overlay orchestrator
//
// JOIN GeoJSON AGEB features (MGN 09a.shp) × CSV demographic rows (RESAGEBURB)
// on composite 13-char key (CVE_ENT||CVE_MUN||CVE_LOC||CVE_AGEB) → batch INSERT
// into public.inegi_ageb_staging (geometry as GeoJSON text + ST_GeomFromGeoJSON
// + ST_Multi + ST_MakeValid).
//
// Then invoke SECDEF RPC recompute_zone_demographics_from_ageb() to compute
// PostGIS spatial overlay (ST_Intersects + ST_Area weighted aggregations) →
// UPSERT inegi_census_zone_stats con data_origin='inegi_ageb_overlay'.
//
// Refs: SA-ITER-Spatial-Overlay-Research.md §4

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { type AgebFeatureCollection, agebJoinKey } from './inegi-mgn-shapefile.ts';
import { type AgebDataRow, agebRowKey } from './inegi-resageburb-csv.ts';

const STAGING_BATCH_SIZE = 200;

export type StagingInsertResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

/**
 * JOIN polygons × CSV rows + batch INSERT staging table.
 */
export async function loadAgebStaging(
  supabase: SupabaseClient<Database>,
  geojson: AgebFeatureCollection,
  csvRows: AgebDataRow[],
): Promise<StagingInsertResult> {
  const csvByKey = new Map<string, AgebDataRow>();
  for (const r of csvRows) csvByKey.set(agebRowKey(r), r);

  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  // Truncate staging first (clean reload — service role bypasses RLS)
  const { error: delErr } = await supabase.from('inegi_ageb_staging').delete().gte('cve_ent', '00');
  if (delErr) {
    errors.push(`truncate: ${delErr.message}`);
  }

  const matched: Array<{ feat: AgebFeatureCollection['features'][number]; row: AgebDataRow }> = [];
  for (const feat of geojson.features) {
    const key = agebJoinKey(feat.properties);
    const row = csvByKey.get(key);
    if (!row) {
      skipped++;
      continue;
    }
    matched.push({ feat, row });
  }

  for (let i = 0; i < matched.length; i += STAGING_BATCH_SIZE) {
    const chunk = matched.slice(i, i + STAGING_BATCH_SIZE);
    const rows = chunk.map(({ feat, row }) => {
      const geom = feat.geometry;
      // ST_GeomFromGeoJSON expects text — supabase client serializes JSON
      // back to text via PostGIS ST_GeomFromGeoJSON cast. Use raw insert
      // via .rpc helper for atomicity, or .insert with explicit cast.
      // Simplest: insert via SECDEF RPC per row OR send GeoJSON as TEXT
      // and rely on PostgREST cast — Supabase needs ST_GeomFromGeoJSON
      // wrapped in a server-side fn. Use .rpc loading helper.
      return {
        cve_ent: row.cve_ent,
        cve_mun: row.cve_mun,
        cve_loc: row.cve_loc,
        cve_ageb: row.cve_ageb,
        geom_geojson_text: JSON.stringify(geom),
        pobtot: row.pobtot,
        poblacion_12y: row.poblacion_12y,
        pob_0_14: row.pob_0_14,
        pob_15_64: row.pob_15_64,
        pob_65_mas: row.pob_65_mas,
        tothog: row.tothog,
        graproes: row.graproes,
        pea: row.pea,
        vph_inter: row.vph_inter,
        vph_pc: row.vph_pc,
      };
    });

    // Insert via batch RPC fn (geometry needs ST_GeomFromGeoJSON cast)
    const { data, error } = await supabase.rpc(
      'load_inegi_ageb_staging_batch' as never,
      {
        p_rows: rows as never,
      } as never,
    );
    if (error) {
      errors.push(`batch ${i / STAGING_BATCH_SIZE}: ${error.message}`);
    } else {
      inserted += (data as number | null) ?? rows.length;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Invoke SECDEF spatial overlay RPC.
 */
export async function recomputeOverlayForZones(
  supabase: SupabaseClient<Database>,
): Promise<{ updated: number; errors: string[]; meta: unknown }> {
  const { data, error } = await supabase.rpc('recompute_zone_demographics_from_ageb');
  if (error) {
    return { updated: 0, errors: [error.message], meta: null };
  }
  const result = data as {
    updated_count?: number;
    errors?: string[];
  } | null;
  return {
    updated: result?.updated_count ?? 0,
    errors: result?.errors ?? [],
    meta: data,
  };
}
