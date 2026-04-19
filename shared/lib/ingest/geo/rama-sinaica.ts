import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB PERMANENTE H2 — activar SINAICA RAMA ingestor cuando se defina scope
// geo ingestion real post-launch. NO bloquea cierre FASE 07b: el backend
// downstream (env score / zone_aqi_summary) ya contempla rows ausentes
// retornando aqi_samples=0 + confidence='insufficient_data'. UI consumers
// muestran badge 'datos-pendientes'.
//
// Sistema Nacional de Información de la Calidad del Aire (INECC). Calidad
// aire por estación (PM2.5, PM10, O3, NO2, SO2, CO). Daily refresh esperado.
// Source: https://sinaica.inecc.gob.mx/
//
// Las 4 señales ADR-018 del stub:
//   1. Este comment (// STUB PERMANENTE H2 — activar...).
//   2. UI badge 'datos-pendientes' en EnvLayer component (FASE 20).
//   3. Documentado en §5.B FASE 07b "Inferencias y stubs permitidos".
//   4. Driver throws RamaNotImplementedError ante fetch/parse/upsert.
//
// Gating: feature flag ingest.rama.enabled=false (default) — solo activable
// cuando se cierre el bloque H2 de geo ingestion real.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.8
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md §6.bis
//       supabase/migrations/20260419089000_str_zone_aqi_aggregate.sql (downstream).

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
