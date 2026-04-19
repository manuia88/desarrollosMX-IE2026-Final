import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con API Locatel CDMX (https://www.locatel.cdmx.gob.mx/).
// Reportes ciudadanos: bacheo, alumbrado público, ruido, fuga de agua,
// basura — indicadores de calidad urbana por zona. Weekly refresh (portal
// 311 CDMX). H2 unlock requiere cliente API Locatel + gates volumen
// (reportes × zona × semana).
// Gating: feature flag ingest.locatel.enabled=false en H1 (ADR-018 señal 1+4).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.16
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const LOCATEL_FEATURE_FLAG = 'ingest.locatel.enabled';
export const LOCATEL_SOURCE = 'locatel' as const;

export class LocatelNotImplementedError extends Error {
  readonly code = 'locatel_not_implemented_h2' as const;
  constructor() {
    super('locatel_not_implemented_h2');
    this.name = 'LocatelNotImplementedError';
  }
}

export const locatelDriver: IngestDriver<void, never> = {
  source: LOCATEL_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'weekly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new LocatelNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new LocatelNotImplementedError();
  },
  async upsert() {
    throw new LocatelNotImplementedError();
  },
};

registerDriver(locatelDriver);

export async function ingestLocatel(): Promise<never> {
  throw new LocatelNotImplementedError();
}
