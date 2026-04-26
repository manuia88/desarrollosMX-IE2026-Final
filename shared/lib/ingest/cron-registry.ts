// Registry de ingestores que pueden ejecutarse vía Vercel cron (sin input externo).
// Solo source REST self-contained (no CSV/XLSX/PDF que requieran fetch step previo).
//
// Sources que requieren fetch externo (FGJ CSV, GTFS zip, SACMEX HTML, Atlas
// shapefile, SIGED CSV, DGIS CSV, BBVA PDF, etc.) se cubren en BLOQUE 7.M
// (auto-fetch con Playwright). Por ahora son admin-upload triggered.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.G + §7.M (planeado)

import { CONAGUA_CDMX_KNOWN_STATIONS, ingestConagua } from './climate/conagua-smn';
import { ingestNoaa, NOAA_CDMX_KNOWN_STATIONS } from './climate/noaa';
import { ingestDenue } from './geo/denue';
import { ingestBanxico } from './macro/banxico';
import { ingestInegi } from './macro/inegi';
import type { IngestResult } from './types';

export type CronRunnableSource = 'banxico' | 'inegi' | 'denue' | 'noaa' | 'conagua';

export const CRON_RUNNABLE_SOURCES: readonly CronRunnableSource[] = [
  'banxico',
  'inegi',
  'denue',
  'noaa',
  'conagua',
] as const;

function lastClosedYearMonth(): string {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
}

const CRON_RUNNERS: Record<CronRunnableSource, () => Promise<IngestResult>> = {
  banxico: () => ingestBanxico({ triggeredBy: 'cron:vercel' }),
  inegi: () => ingestInegi({ triggeredBy: 'cron:vercel' }),
  denue: () => ingestDenue({ triggeredBy: 'cron:vercel' }),
  noaa: () => {
    const ym = lastClosedYearMonth();
    return ingestNoaa({
      stationIds: NOAA_CDMX_KNOWN_STATIONS.map((s) => s.station_id),
      startYearMonth: ym,
      endYearMonth: ym,
    });
  },
  conagua: () =>
    ingestConagua({
      stationIds: CONAGUA_CDMX_KNOWN_STATIONS.map((s) => s.station_id),
      startYearMonth: lastClosedYearMonth(),
      endYearMonth: lastClosedYearMonth(),
    }),
};

export function isCronRunnableSource(source: string): source is CronRunnableSource {
  return (CRON_RUNNABLE_SOURCES as readonly string[]).includes(source);
}

export async function runCronIngest(source: CronRunnableSource): Promise<IngestResult> {
  return await CRON_RUNNERS[source]();
}
