import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2+ con partnerships bilaterales firmados.
// Candidatos prioritarios: Propiedades.com, Lamudi, Vivanuncios (post-Adevinta).
// Patrón: feed JSON oficial (REST/webhook) por portal → market_prices_secondary
// con captured_via = 'partnership_feed'.
// Gating: feature flag market.partnership_feed.enabled=false hasta firma legal.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.5
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md §128 (Vía 3 H2+)
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-017_DATA_ECOSYSTEM_REVENUE.md
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md §6.bis

export const PARTNERSHIP_FEED_FEATURE_FLAG = 'market.partnership_feed.enabled';
export const PARTNERSHIP_FEED_SOURCE = 'partnership_feed' as const;

export class PartnershipFeedNotImplementedError extends Error {
  readonly code = 'partnership_feed_not_implemented_h2' as const;
  constructor() {
    super('partnership_feed_not_implemented_h2');
    this.name = 'PartnershipFeedNotImplementedError';
  }
}

export const partnershipFeedDriver: IngestDriver<void, never> = {
  source: PARTNERSHIP_FEED_SOURCE,
  category: 'market',
  defaultPeriodicity: 'daily',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new PartnershipFeedNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new PartnershipFeedNotImplementedError();
  },
  async upsert() {
    throw new PartnershipFeedNotImplementedError();
  },
};

registerDriver(partnershipFeedDriver);

export async function ingestPartnershipFeed(): Promise<never> {
  throw new PartnershipFeedNotImplementedError();
}
