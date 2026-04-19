import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con API CONAGUA (https://smn.conagua.gob.mx/).
// Comisión Nacional del Agua. Precipitación diaria + riesgo hídrico por
// zona (inundación, sequía). SMN (Servicio Meteorológico Nacional) expone
// series diarias. Daily refresh. H2 unlock requiere cliente SMN + gates
// de validez geográfica MX.
// Gating: feature flag ingest.conagua.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.13
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const CONAGUA_FEATURE_FLAG = 'ingest.conagua.enabled';
export const CONAGUA_SOURCE = 'conagua' as const;

export class ConaguaNotImplementedError extends Error {
  readonly code = 'conagua_not_implemented_h2' as const;
  constructor() {
    super('conagua_not_implemented_h2');
    this.name = 'ConaguaNotImplementedError';
  }
}

export const conaguaDriver: IngestDriver<void, never> = {
  source: CONAGUA_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'daily',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new ConaguaNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new ConaguaNotImplementedError();
  },
  async upsert() {
    throw new ConaguaNotImplementedError();
  },
};

registerDriver(conaguaDriver);

export async function ingestConagua(): Promise<never> {
  throw new ConaguaNotImplementedError();
}
