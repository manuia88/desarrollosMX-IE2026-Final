// Climate Real Backfill — F1.B 2026-04-26.
//
// Run order:
//   1. Refresh zone_climate_station_map (Voronoi nearest-station per source).
//   2. Run NOAA NCEI fetcher (8 active stations × 192 months → ~1500 calls).
//   3. Run CONAGUA SMN fetcher (13 active stations × 1 file each → 13 calls).
//   4. Print summary counts per source.
//
// Idempotent: UPSERT on (zone_id, year_month) replaces synthetic rows in place.
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
  console.info('[climate-backfill] step 1/4 refresh zone_climate_station_map');
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
    `[climate-backfill] step 2/4 NOAA NCEI ${startYearMonth}..${endYearMonth} (${NOAA_CDMX_KNOWN_STATIONS.length} stations)`,
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
    `[climate-backfill] step 3/4 CONAGUA SMN ${startYearMonth}..${endYearMonth} (${CONAGUA_CDMX_KNOWN_STATIONS.length} stations)`,
  );
  const conaguaResult = await ingestConagua({
    stationIds: CONAGUA_CDMX_KNOWN_STATIONS.map((s) => s.station_id),
    startYearMonth,
    endYearMonth,
  });
  console.info(
    `[climate-backfill] CONAGUA inserted=${conaguaResult.rows_inserted} dlq=${conaguaResult.rows_dlq} errors=${conaguaResult.errors.length}`,
  );

  console.info('[climate-backfill] step 4/4 sweep deprecated heuristic_v1 rows');
  const supabase = createAdminClient();
  const { count: heuristicLeft } = await supabase
    .from('climate_monthly_aggregates')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'heuristic_v1');
  console.info(`[climate-backfill] heuristic_v1 remaining=${heuristicLeft ?? 0}`);

  const { data: bySource } = await supabase
    .from('climate_monthly_aggregates')
    .select('source')
    .limit(50000);
  const breakdown: Record<string, number> = {};
  for (const r of bySource ?? []) {
    const s = r.source;
    breakdown[s] = (breakdown[s] ?? 0) + 1;
  }
  console.info('[climate-backfill] source breakdown:', breakdown);

  const dur = Math.round((Date.now() - start) / 1000);
  console.info(`[climate-backfill] done in ${dur}s`);
}

main().catch((err) => {
  console.error('[climate-backfill] fatal', err);
  process.exit(1);
});
