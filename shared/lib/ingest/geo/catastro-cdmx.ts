import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset Catastro CDMX (https://datos.cdmx.gob.mx/).
// Valor catastral de predios CDMX por cuenta catastral. Dataset publicado en
// portal Datos Abiertos CDMX (Tesorería). Yearly refresh (actualización
// catastral anual). H2 unlock requiere parser CSV + join con h3_r8.
// Gating: feature flag ingest.catastro_cdmx.enabled=false en H1 (ADR-018
// señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.10
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const CATASTRO_CDMX_FEATURE_FLAG = 'ingest.catastro_cdmx.enabled';
export const CATASTRO_CDMX_SOURCE = 'catastro_cdmx' as const;

export class CatastroCdmxNotImplementedError extends Error {
  readonly code = 'catastro_cdmx_not_implemented_h2' as const;
  constructor() {
    super('catastro_cdmx_not_implemented_h2');
    this.name = 'CatastroCdmxNotImplementedError';
  }
}

export const catastroCdmxDriver: IngestDriver<void, never> = {
  source: CATASTRO_CDMX_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'yearly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new CatastroCdmxNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new CatastroCdmxNotImplementedError();
  },
  async upsert() {
    throw new CatastroCdmxNotImplementedError();
  },
};

registerDriver(catastroCdmxDriver);

export async function ingestCatastroCdmx(): Promise<never> {
  throw new CatastroCdmxNotImplementedError();
}
