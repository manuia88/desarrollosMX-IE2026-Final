import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H1 final con google-trends-api npm package (autorización pendiente).
// Plan §7.E.2: keywords "departamentos <colonia>", "casas <ciudad>", "venta <zona>" → search_trends.
// Frecuencia semanal. Gating: feature flag ingest.google_trends.enabled=false hasta autorización lib.
//
// El paquete google-trends-api (último release 2020-12) no está mantenido oficialmente; se evalúa:
//   (a) usar la lib y aceptar el riesgo de breakage Google-side
//   (b) llamar directamente al endpoint trends.google.com/trends/api/explore (unofficial)
//   (c) pivot a un dataset alternativo (ej. search_trends desde Bigquery Public Datasets)
// Pendiente decisión founder.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md §6.bis (4 señales STUB)

export const GOOGLE_TRENDS_FEATURE_FLAG = 'ingest.google_trends.enabled';
export const GOOGLE_TRENDS_SOURCE = 'google_trends' as const;

export class GoogleTrendsNotImplementedError extends Error {
  readonly code = 'google_trends_not_implemented_lib_pending' as const;
  constructor() {
    super('google_trends_not_implemented_lib_pending');
    this.name = 'GoogleTrendsNotImplementedError';
  }
}

export const googleTrendsDriver: IngestDriver<void, never> = {
  source: GOOGLE_TRENDS_SOURCE,
  category: 'market',
  defaultPeriodicity: 'weekly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new GoogleTrendsNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new GoogleTrendsNotImplementedError();
  },
  async upsert() {
    throw new GoogleTrendsNotImplementedError();
  },
};

registerDriver(googleTrendsDriver);

export async function ingestGoogleTrends(): Promise<never> {
  throw new GoogleTrendsNotImplementedError();
}
