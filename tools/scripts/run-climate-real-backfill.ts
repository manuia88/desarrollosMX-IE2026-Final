// Climate Real Backfill — F1.C.A 2026-04-26.
//
// Run order:
//   1. Refresh zone_climate_station_map (Voronoi nearest-station per source).
//   2. Run NOAA NCEI fetcher (8 active stations × 192 months → ~1500 calls).
//      Writes to climate_source_observations (source='noaa').
//   3. Run CONAGUA SMN fetcher (13 active stations × 1 file each → 13 calls).
//      Writes to climate_source_observations (source='conagua').
//   4. Invoke recompute_climate_aggregates_from_observations() SECDEF to
//      derive canonical winner rows in climate_monthly_aggregates with
//      cross_validation_status (single_source_* / cross_validated_match /
//      cross_validated_outlier_*).
//   5. Print summary counts per source + cross-validation status breakdown.
//
// Idempotent: UPSERT on (zone_id, year_month, source) preserves both NOAA +
// CONAGUA observations; recompute is pure function of observations.
//
// Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOAA_TOKEN.
// Load via shell: `set -a; source .env.local; set +a` before invoking.
//
// Run via:
//   node --experimental-strip-types --experimental-transform-types \
//     --import=./scripts/compute/_register-ts-loader.mjs \
//     tools/scripts/run-climate-real-backfill.ts

import {
  CONAGUA_CDMX_KNOWN_STATIONS,
  ingestConagua,
} from '@/shared/lib/ingest/climate/conagua-smn';
import { ingestNoaa, NOAA_CDMX_KNOWN_STATIONS } from '@/shared/lib/ingest/climate/noaa';
import { refreshStationMapForCDMX } from '@/shared/lib/ingest/climate/spatial-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';

async function main(): Promise<void> {
  const start = Date.now();
  console.info('[climate-backfill] step 1/5 refresh zone_climate_station_map');
  const stations = [...NOAA_CDMX_KNOWN_STATIONS, ...CONAGUA_CDMX_KNOWN_STATIONS];
  const mapResult = await refreshStationMapForCDMX({ stations });
  console.info(
    `[climate-backfill] mapped ${mapResult.zones_mapped} zone-source pairs`,
    mapResult.source_breakdown,
  );

  const now = new Date();
  const endYearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const startYearMonth = `${now.getUTCFullYear() - 15}-01`;

  console.info(
    `[climate-backfill] step 2/5 NOAA NCEI ${startYearMonth}..${endYearMonth} (${NOAA_CDMX_KNOWN_STATIONS.length} stations) → climate_source_observations`,
  );
  const noaaResult = await ingestNoaa({
    stationIds: NOAA_CDMX_KNOWN_STATIONS.map((s) => s.station_id),
    startYearMonth,
    endYearMonth,
  });
  console.info(
    `[climate-backfill] NOAA inserted=${noaaResult.rows_inserted} dlq=${noaaResult.rows_dlq} errors=${noaaResult.errors.length}`,
  );

  console.info(
    `[climate-backfill] step 3/5 CONAGUA SMN ${startYearMonth}..${endYearMonth} (${CONAGUA_CDMX_KNOWN_STATIONS.length} stations) → climate_source_observations`,
  );
  const conaguaResult = await ingestConagua({
    stationIds: CONAGUA_CDMX_KNOWN_STATIONS.map((s) => s.station_id),
    startYearMonth,
    endYearMonth,
  });
  console.info(
    `[climate-backfill] CONAGUA inserted=${conaguaResult.rows_inserted} dlq=${conaguaResult.rows_dlq} errors=${conaguaResult.errors.length}`,
  );

  console.info('[climate-backfill] step 4/5 recompute_climate_aggregates_from_observations');
  const supabase = createAdminClient();
  const { data: recomputeStats, error: recomputeErr } = await supabase.rpc(
    'recompute_climate_aggregates_from_observations',
    {},
  );
  if (recomputeErr) {
    console.error('[climate-backfill] recompute failed', recomputeErr);
    throw new Error(`recompute_failed: ${recomputeErr.message}`);
  }
  console.info('[climate-backfill] recompute stats', recomputeStats);

  console.info('[climate-backfill] step 5/5 verify counts + cross-validation breakdown');

  const { data: bySourceObs } = await supabase
    .from('climate_source_observations')
    .select('source')
    .limit(100000);
  const obsBreakdown: Record<string, number> = {};
  for (const r of bySourceObs ?? []) {
    obsBreakdown[r.source] = (obsBreakdown[r.source] ?? 0) + 1;
  }
  console.info('[climate-backfill] climate_source_observations breakdown:', obsBreakdown);

  const { data: byStatus } = await supabase
    .from('climate_monthly_aggregates')
    .select('cross_validation_status, source')
    .limit(100000);
  const statusBreakdown: Record<string, number> = {};
  const sourceBreakdown: Record<string, number> = {};
  for (const r of byStatus ?? []) {
    const s = r.cross_validation_status ?? 'null';
    statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1;
    const src = r.source;
    sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
  }
  console.info('[climate-backfill] climate_monthly_aggregates source breakdown:', sourceBreakdown);
  console.info('[climate-backfill] cross_validation_status breakdown:', statusBreakdown);

  const dur = Math.round((Date.now() - start) / 1000);
  console.info(`[climate-backfill] done in ${dur}s`);
}

main().catch((err) => {
  console.error('[climate-backfill] fatal', err);
  process.exit(1);
});
