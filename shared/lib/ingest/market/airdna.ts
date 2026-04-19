import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con AirDNA MarketMinder API (Enterprise plan ~$500+/mes).
// Plan §7.E.3: occupancy_rate, ADR, RevPAR, listings_count por zona → market_pulse.
// Cron mensual. Gating: feature flag ingest.airdna.enabled=false hasta plan contratado.
//
// Pivot evaluado: AirROI (alternativa más económica) — ver FASE 07b STR Intelligence.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.3
//       docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md §6.bis (4 señales STUB)

export const AIRDNA_FEATURE_FLAG = 'ingest.airdna.enabled';
export const AIRDNA_SOURCE = 'airdna' as const;

export class AirdnaNotImplementedError extends Error {
  readonly code = 'airdna_not_implemented_h2' as const;
  constructor() {
    super('airdna_not_implemented_h2');
    this.name = 'AirdnaNotImplementedError';
  }
}

export const airdnaDriver: IngestDriver<void, never> = {
  source: AIRDNA_SOURCE,
  category: 'market',
  defaultPeriodicity: 'monthly',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new AirdnaNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new AirdnaNotImplementedError();
  },
  async upsert() {
    throw new AirdnaNotImplementedError();
  },
};

registerDriver(airdnaDriver);

export async function ingestAirdna(): Promise<never> {
  throw new AirdnaNotImplementedError();
}
