import { type IngestDriver, registerDriver } from '../driver';
import type { IngestCtx } from '../types';

// STUB — activar H2 con Mapbox Directions API (https://www.mapbox.com/).
// Tráfico on-demand (tiempo estimado punto A → punto B en hora pico vs
// hora valle). **On-demand, NO bulk**: se invoca por consulta de usuario
// contra propiedades específicas, no cron periódico.
//
// Cost model: aprox ~$0.50 USD por call (Directions Matrix API, tarifa
// Mapbox a feb 2026). `estimatedCostUsd` TBD en runtime por call count.
// Requiere setup de budget_cap en FASE 07b (budget por tenant + circuit
// breaker si se excede).
//
// Gating: feature flag ingest.mapbox_traffic.enabled=false en H1
// (ADR-018 señal 1+4). H2 unlock requiere:
//   1. MAPBOX_ACCESS_TOKEN env
//   2. budget_cap table row para mapbox_traffic
//   3. cost-tracker integration on-demand (no watermark-based)
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.17
//       docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE.md (budget caps)
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_STUB_POLICY.md §6.bis

export const MAPBOX_TRAFFIC_FEATURE_FLAG = 'ingest.mapbox_traffic.enabled';
export const MAPBOX_TRAFFIC_SOURCE = 'mapbox_traffic' as const;
// Estimado por call (Directions Matrix API). Refinar en H2 con pricing oficial.
export const MAPBOX_TRAFFIC_ESTIMATED_COST_USD_PER_CALL = 0.5;

export class MapboxTrafficNotImplementedError extends Error {
  readonly code = 'mapbox_traffic_not_implemented_h2' as const;
  constructor() {
    super('mapbox_traffic_not_implemented_h2');
    this.name = 'MapboxTrafficNotImplementedError';
  }
}

export const mapboxTrafficDriver: IngestDriver<void, never> = {
  source: MAPBOX_TRAFFIC_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'on_demand',
  async fetch(_ctx: IngestCtx): Promise<never> {
    throw new MapboxTrafficNotImplementedError();
  },
  async parse(): Promise<never[]> {
    throw new MapboxTrafficNotImplementedError();
  },
  async upsert() {
    throw new MapboxTrafficNotImplementedError();
  },
};

registerDriver(mapboxTrafficDriver);

export async function ingestMapboxTraffic(): Promise<never> {
  throw new MapboxTrafficNotImplementedError();
}
