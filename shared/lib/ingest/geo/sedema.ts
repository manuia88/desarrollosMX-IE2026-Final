import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset SEDEMA (https://www.sedema.cdmx.gob.mx/).
// Secretaría del Medio Ambiente CDMX. Alertas atmosféricas
// (contingencia fase 1/2) + inventario de áreas verdes por delegación.
// Daily refresh (alertas se activan dinámicamente). H2 unlock con API o
// scraping autorizado del portal oficial.
// Gating: feature flag ingest.sedema.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.12
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const SEDEMA_FEATURE_FLAG = 'ingest.sedema.enabled';
export const SEDEMA_SOURCE = 'sedema' as const;

export class SedemaNotImplementedError extends Error {
  readonly code = 'sedema_not_implemented_h2' as const;
  constructor() {
    super('sedema_not_implemented_h2');
    this.name = 'SedemaNotImplementedError';
  }
}

export const sedemaDriver: IngestDriver<void, never> = {
  source: SEDEMA_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'daily',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new SedemaNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new SedemaNotImplementedError();
  },
  async upsert() {
    throw new SedemaNotImplementedError();
  },
};

registerDriver(sedemaDriver);

export async function ingestSedema(): Promise<never> {
  throw new SedemaNotImplementedError();
}
