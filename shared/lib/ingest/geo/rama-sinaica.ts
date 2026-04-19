import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset SINAICA real (https://sinaica.inecc.gob.mx/).
// Sistema Nacional de Información de la Calidad del Aire (INECC). Calidad
// aire por estación (PM2.5, PM10, O3, NO2, SO2, CO). Daily refresh.
// Gating: feature flag ingest.rama.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.8
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const RAMA_FEATURE_FLAG = 'ingest.rama.enabled';
export const RAMA_SOURCE = 'rama' as const;

export class RamaNotImplementedError extends Error {
  readonly code = 'rama_sinaica_not_implemented_h2' as const;
  constructor() {
    super('rama_sinaica_not_implemented_h2');
    this.name = 'RamaNotImplementedError';
  }
}

export const ramaDriver: IngestDriver<void, never> = {
  source: RAMA_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'daily',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new RamaNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new RamaNotImplementedError();
  },
  async upsert() {
    throw new RamaNotImplementedError();
  },
};

registerDriver(ramaDriver);

export async function ingestRama(): Promise<never> {
  throw new RamaNotImplementedError();
}
