import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset SEDUVI (https://www.seduvi.cdmx.gob.mx/).
// Uso de suelo CDMX por polígono (habitacional, mixto, comercial, industrial,
// áreas verdes). Shapefile oficial publicado en portal Datos Abiertos CDMX.
// H2 unlock requiere pipeline shp→geojson (ogr2ogr o shpjs). Yearly refresh.
// Gating: feature flag ingest.seduvi.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.9
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const SEDUVI_FEATURE_FLAG = 'ingest.seduvi.enabled';
export const SEDUVI_SOURCE = 'seduvi' as const;

export class SeduviNotImplementedError extends Error {
  readonly code = 'seduvi_not_implemented_h2' as const;
  constructor() {
    super('seduvi_not_implemented_h2');
    this.name = 'SeduviNotImplementedError';
  }
}

export const seduviDriver: IngestDriver<void, never> = {
  source: SEDUVI_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'yearly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new SeduviNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new SeduviNotImplementedError();
  },
  async upsert() {
    throw new SeduviNotImplementedError();
  },
};

registerDriver(seduviDriver);

export async function ingestSeduvi(): Promise<never> {
  throw new SeduviNotImplementedError();
}
