import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset PAOT (https://www.paot.org.mx/).
// Procuraduría Ambiental y del Ordenamiento Territorial CDMX. Denuncias
// ciudadanas ambientales georreferenciadas. Monthly refresh (portal datos).
// H2 unlock requiere scraping autorizado + parser JSON/CSV según formato
// que publique el portal.
// Gating: feature flag ingest.paot.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.11
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const PAOT_FEATURE_FLAG = 'ingest.paot.enabled';
export const PAOT_SOURCE = 'paot' as const;

export class PaotNotImplementedError extends Error {
  readonly code = 'paot_not_implemented_h2' as const;
  constructor() {
    super('paot_not_implemented_h2');
    this.name = 'PaotNotImplementedError';
  }
}

export const paotDriver: IngestDriver<void, never> = {
  source: PAOT_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'monthly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new PaotNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new PaotNotImplementedError();
  },
  async upsert() {
    throw new PaotNotImplementedError();
  },
};

registerDriver(paotDriver);

export async function ingestPaot(): Promise<never> {
  throw new PaotNotImplementedError();
}
