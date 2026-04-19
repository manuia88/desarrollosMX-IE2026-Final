import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con dataset INAH (https://www.inah.gob.mx/).
// Instituto Nacional de Antropología e Historia. Zonas arqueológicas +
// monumentos históricos (restricciones construcción / protección patrimonial
// INAH). Yearly refresh. H2 unlock requiere shapefile oficial INAH o
// dataset portal Datos MX.
// Gating: feature flag ingest.inah.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.14
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const INAH_FEATURE_FLAG = 'ingest.inah.enabled';
export const INAH_SOURCE = 'inah' as const;

export class InahNotImplementedError extends Error {
  readonly code = 'inah_not_implemented_h2' as const;
  constructor() {
    super('inah_not_implemented_h2');
    this.name = 'InahNotImplementedError';
  }
}

export const inahDriver: IngestDriver<void, never> = {
  source: INAH_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'yearly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new InahNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new InahNotImplementedError();
  },
  async upsert() {
    throw new InahNotImplementedError();
  },
};

registerDriver(inahDriver);

export async function ingestInah(): Promise<never> {
  throw new InahNotImplementedError();
}
