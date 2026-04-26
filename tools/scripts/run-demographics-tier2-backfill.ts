// Demographics Tier 2 Backfill — F1.C.C INEGI AGEB spatial overlay + ENIGH downscale.
//
// Pipeline:
//   1. Download MGN CDMX shapefile ZIP (~83 MB) → extract 09a.shp AGEB polygons
//      reprojected to EPSG:4326 via shpjs.
//   2. Download RESAGEBURB CDMX CSV ZIP (~12 MB) → parse 2,433 AGEB-total rows
//      via papaparse (preserve hex AGEB codes, coerce '*' → null).
//   3. JOIN polygons × CSV on composite 13-char key → batch INSERT staging via
//      SECDEF load_inegi_ageb_staging_batch (chunks 200 rows).
//   4. Invoke SECDEF recompute_zone_demographics_from_ageb() — PostGIS
//      ST_Intersects + ST_Area population-weighted overlay → UPSERT
//      inegi_census_zone_stats con data_origin='inegi_ageb_overlay'.
//   5. ENIGH downscale: compute per-colonia median_salary_mxn vía formula:
//        ratio = colonia.graproes_anios / state_graproes_anios (CDMX ~11.5)
//        ratio = clamp(ratio, 0.30, 3.00)
//        median = state_median * ratio
//      Update enigh_zone_income con data_origin='enigh_2022_state_downscaled_via_censo_2020_proxy'.
//
// Run:
//   set -a; source .env.local; set +a
//   NODE_OPTIONS=--max-old-space-size=2048 \
//     node --experimental-strip-types --experimental-transform-types \
//     --import=./scripts/compute/_register-ts-loader.mjs \
//     tools/scripts/run-demographics-tier2-backfill.ts

import { createClient } from '@supabase/supabase-js';
import {
  loadAgebStaging,
  recomputeOverlayForZones,
} from '@/shared/lib/ingest/macro/ageb-spatial-overlay';
import {
  downloadMgnZip,
  extractAgebLayer,
  normalizeAgebProperties,
} from '@/shared/lib/ingest/macro/inegi-mgn-shapefile';
import {
  downloadResageburbZip,
  extractCsvFromZip,
  parseResageburbCsv,
} from '@/shared/lib/ingest/macro/inegi-resageburb-csv';
import type { Database } from '@/shared/types/database';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`required env missing: ${name}`);
  return v;
}
const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

// ENIGH 2022 CDMX state-level median household income mensual (INEGI Comunicado
// 414/23 — CDMX is highest entity at ~MXN 22,219/mes; conservative seed value).
const ENIGH_2022_CDMX_STATE_MEDIAN_MXN = 22219;
const CDMX_STATE_GRAPROES_2020 = 11.5; // años promedio escolaridad pob 15+ (Censo 2020)
const DOWNSCALE_RATIO_MIN = 0.3;
const DOWNSCALE_RATIO_MAX = 3.0;

async function main(): Promise<void> {
  const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY);
  const startedAt = new Date();
  console.log(`[tier2-backfill] start ${startedAt.toISOString()}`);

  // ============================================================================
  // STEP 1 — Download MGN shapefile ZIP + extract AGEB polygons
  // ============================================================================
  console.log('[tier2-backfill] [1/5] downloading MGN CDMX ZIP (~83 MB)...');
  const mgnZip = await downloadMgnZip();
  console.log(`[tier2-backfill] MGN downloaded: ${(mgnZip.byteLength / 1e6).toFixed(1)} MB`);

  console.log('[tier2-backfill] extracting 09a.shp via shpjs (auto-reproject EPSG:6372→4326)...');
  const agebLayer = await extractAgebLayer(mgnZip);
  const normalized = normalizeAgebProperties(agebLayer);
  console.log(`[tier2-backfill] AGEB polygons parsed: ${normalized.features.length}`);

  // ============================================================================
  // STEP 2 — Download RESAGEBURB CSV + parse
  // ============================================================================
  console.log('[tier2-backfill] [2/5] downloading RESAGEBURB CDMX ZIP (~12 MB)...');
  const csvZip = await downloadResageburbZip();
  const csvText = extractCsvFromZip(csvZip);
  console.log(`[tier2-backfill] CSV extracted: ${(csvText.length / 1e6).toFixed(1)} MB`);

  console.log('[tier2-backfill] parsing CSV (papaparse, dynamicTyping=false)...');
  const csvRows = parseResageburbCsv(csvText);
  console.log(`[tier2-backfill] CSV AGEB-total rows: ${csvRows.length}`);

  // Quality gates
  if (normalized.features.length < 1850) {
    throw new Error(
      `[tier2-backfill] AGEB polygon count too low: ${normalized.features.length} < 1850`,
    );
  }
  if (csvRows.length < 1900) {
    throw new Error(`[tier2-backfill] AGEB CSV rows too low: ${csvRows.length} < 1900`);
  }

  // ============================================================================
  // STEP 3 — Batch INSERT staging (geometry + indicators)
  // ============================================================================
  console.log('[tier2-backfill] [3/5] loading inegi_ageb_staging via SECDEF batch loader...');
  const stagingResult = await loadAgebStaging(supabase, normalized, csvRows);
  console.log(
    `[tier2-backfill] staging: inserted=${stagingResult.inserted} skipped=${stagingResult.skipped}`,
  );
  if (stagingResult.errors.length > 0) {
    console.error(`[tier2-backfill] staging errors: ${stagingResult.errors.join(' | ')}`);
  }

  // ============================================================================
  // STEP 4 — Spatial overlay RPC
  // ============================================================================
  console.log('[tier2-backfill] [4/5] invoking recompute_zone_demographics_from_ageb()...');
  const overlayResult = await recomputeOverlayForZones(supabase);
  console.log(`[tier2-backfill] overlay: updated=${overlayResult.updated}`);
  if (overlayResult.errors.length > 0) {
    console.error(`[tier2-backfill] overlay errors: ${overlayResult.errors.join(' | ')}`);
  }

  // ============================================================================
  // STEP 5 — ENIGH downscale (post-overlay: now have graproes_anios per colonia)
  // ============================================================================
  console.log('[tier2-backfill] [5/5] ENIGH 2022 downscale via graproes proxy...');
  const { data: censusRows, error: censusErr } = await supabase
    .from('inegi_census_zone_stats')
    .select('zone_id, graproes_anios')
    .eq('data_origin', 'inegi_ageb_overlay')
    .not('graproes_anios', 'is', null);
  if (censusErr) {
    throw new Error(`[tier2-backfill] census fetch error: ${censusErr.message}`);
  }
  console.log(`[tier2-backfill] colonias with graproes_anios: ${(censusRows ?? []).length}`);

  let enighUpdated = 0;
  for (const row of censusRows ?? []) {
    if (row.graproes_anios == null) continue;
    const ratio = clamp(
      row.graproes_anios / CDMX_STATE_GRAPROES_2020,
      DOWNSCALE_RATIO_MIN,
      DOWNSCALE_RATIO_MAX,
    );
    const median = ENIGH_2022_CDMX_STATE_MEDIAN_MXN * ratio;
    const { error: upsertErr } = await supabase.from('enigh_zone_income').upsert(
      {
        zone_id: row.zone_id,
        snapshot_date: '2022-12-31',
        salary_range_distribution: [],
        median_salary_mxn: Math.round(median),
        data_origin: 'enigh_2022_state_downscaled_via_censo_2020_proxy',
        downscale_proxy_ratio: Number(ratio.toFixed(4)),
      },
      { onConflict: 'zone_id,snapshot_date' },
    );
    if (upsertErr) {
      console.error(`[tier2-backfill] enigh upsert ${row.zone_id}: ${upsertErr.message}`);
    } else {
      enighUpdated++;
    }
  }
  console.log(`[tier2-backfill] ENIGH downscaled: ${enighUpdated} colonias`);

  // ============================================================================
  // ingest_runs observability log
  // ============================================================================
  const completedAt = new Date();
  await supabase.from('ingest_runs').insert({
    source: 'inegi_resageburb_overlay',
    country_code: 'MX',
    status: 'success',
    rows_inserted: stagingResult.inserted,
    rows_updated: overlayResult.updated + enighUpdated,
    rows_skipped: stagingResult.skipped,
    rows_dlq: 0,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    duration_ms: completedAt.getTime() - startedAt.getTime(),
    cost_estimated_usd: 0,
    triggered_by: 'cli:run-demographics-tier2-backfill',
    meta: {
      ageb_polygons: normalized.features.length,
      csv_rows: csvRows.length,
      overlay_updated: overlayResult.updated,
      enigh_downscaled: enighUpdated,
      methodology: 'postgis_st_intersection_v1+graproes_proxy_v1',
    },
  });

  console.log(
    `[tier2-backfill] DONE duration=${((completedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}s`,
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

main().catch((err) => {
  console.error('[tier2-backfill] FATAL', err);
  process.exit(1);
});
