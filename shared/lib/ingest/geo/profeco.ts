import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset PROFECO (https://www.gob.mx/profeco).
// Procuraduría Federal del Consumidor. Denuncias contra desarrolladoras
// inmobiliarias por zona (señal negativa de reputación). Monthly refresh
// (portal datos abiertos PROFECO). H2 unlock requiere parser CSV/JSON
// + geocoding de dirección → h3_r8.
// Gating: feature flag ingest.profeco.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.15
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const PROFECO_FEATURE_FLAG = 'ingest.profeco.enabled';
export const PROFECO_SOURCE = 'profeco' as const;

export class ProfecoNotImplementedError extends Error {
  readonly code = 'profeco_not_implemented_h2' as const;
  constructor() {
    super('profeco_not_implemented_h2');
    this.name = 'ProfecoNotImplementedError';
  }
}

export const profecoDriver: IngestDriver<void, never> = {
  source: PROFECO_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'monthly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new ProfecoNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new ProfecoNotImplementedError();
  },
  async upsert() {
    throw new ProfecoNotImplementedError();
  },
};

registerDriver(profecoDriver);

export async function ingestProfeco(): Promise<never> {
  throw new ProfecoNotImplementedError();
}
