// Registry de ingestores que pueden ejecutarse vía Vercel cron (sin input externo).
// Solo source REST self-contained (no CSV/XLSX/PDF que requieran fetch step previo).
//
// Sources que requieren fetch externo (FGJ CSV, GTFS zip, SACMEX HTML, Atlas
// shapefile, SIGED CSV, DGIS CSV, BBVA PDF, etc.) se cubren en BLOQUE 7.M
// (auto-fetch con Playwright). Por ahora son admin-upload triggered.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.G + §7.M (planeado)

import { ingestDenue } from './geo/denue';
import { ingestBanxico } from './macro/banxico';
import { ingestInegi } from './macro/inegi';
import type { IngestResult } from './types';

export type CronRunnableSource = 'banxico' | 'inegi' | 'denue';

export const CRON_RUNNABLE_SOURCES: readonly CronRunnableSource[] = [
  'banxico',
  'inegi',
  'denue',
] as const;

const CRON_RUNNERS: Record<CronRunnableSource, () => Promise<IngestResult>> = {
  banxico: () => ingestBanxico({ triggeredBy: 'cron:vercel' }),
  inegi: () => ingestInegi({ triggeredBy: 'cron:vercel' }),
  denue: () => ingestDenue({ triggeredBy: 'cron:vercel' }),
};

export function isCronRunnableSource(source: string): source is CronRunnableSource {
  return (CRON_RUNNABLE_SOURCES as readonly string[]).includes(source);
}

export async function runCronIngest(source: CronRunnableSource): Promise<IngestResult> {
  return await CRON_RUNNERS[source]();
}
