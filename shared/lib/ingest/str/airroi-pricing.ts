// AirROI pricing table — precios REALES validados empíricamente, NO docs.
//
// Rationale: la documentación pública de AirROI menciona ~$0.01/call como
// precio orientativo, pero el Developer Dashboard real muestra promedios muy
// superiores (~$0.10/call para endpoints GET simples, $0.50+ para POST con
// paginación). Esta tabla es la fuente de verdad para:
//
//   1. `shared/lib/ingest/cost-tracker.ts preCheckBudget(source, estimatedCostUsd)`
//   2. Alertas budget 50% / 80% / 100% sobre `api_budgets.airroi`.
//   3. Cálculo de costo estimado por job antes de enviar a `runIngest`.
//
// Validación U3 (FASE 07b) — 2026-04-19:
//   - GET /markets/search?query=X  → ~$0.10 (validado).
//   - POST /markets/summary        → ~$0.10 (user-validated prior turn).
//   - POST /markets/metrics/all    → ~$0.50 (user-validated prior turn).
//   - POST /listings/search/market → ~$0.50 (validado U3: HTTP 200, 10 listings/page).
//   - GET  /listings/export_market → NO existe como REST directo (404 en todas las
//     variantes probadas). Path exclusivo del MCP server https://mcp.airroi.com.
//     Uso: `mcp__airroi__airroi_export_market` tool. Pricing MCP TBD en 7b.A.2
//     (primer call contra Roma Sur consolidará).
//
// Consecuencias arquitectónicas (input para ADR-020 MCP-First):
//   - REST `/listings/search/market` con `page_size` max 10 obliga a >100 calls
//     por sub-colonia CDMX y >2300 calls para CDMX total. A $0.50/call eso
//     excede el budget $500/mes solo para una corrida de bulk export.
//   - MCP `airroi_export_market` resuelve paginación interna en 1 tool call.
//     Es el path viable para bulk ingest H1.
//   - Backend REST se usa para:
//       (a) metrics/all (series temporales por market, costo plano $0.50/market),
//       (b) markets/search/summary (resolución identifiers + snapshots rápidos),
//       (c) on-demand listings/search/market cuando UI/Copilot pide filtros
//           específicos bounded (≤100 listings/query).
//   - MCP se usa para:
//       (a) bulk export mensual/trimestral de listings por market (FASE 07b.A.2),
//       (b) Copilot agentic interactions (FASE 03 downstream),
//       (c) STR Watchdog nightly agent (7b.P soft upgrade).

export const AIRROI_BASE_URL = 'https://api.airroi.com';
export const AIRROI_MCP_URL = 'https://mcp.airroi.com';

export type AirroiEndpointKey =
  | 'markets_search'
  | 'markets_summary'
  | 'markets_metrics_all'
  | 'markets_active_listings'
  | 'markets_occupancy'
  | 'markets_adr'
  | 'markets_revpar'
  | 'markets_revenue'
  | 'markets_future_pacing'
  | 'markets_lead_time'
  | 'markets_los'
  | 'listings_search_market'
  | 'listings_search_radius'
  | 'listings_search_polygon'
  | 'listings_get'
  | 'listings_metrics'
  | 'listings_future_rates'
  | 'listings_estimate_revenue'
  | 'listings_find_comparables'
  | 'listings_batch'
  | 'mcp_export_market';

export interface AirroiEndpointSpec {
  readonly method: 'GET' | 'POST' | 'MCP';
  readonly path: string;
  readonly estimated_cost_usd: number;
  readonly validation_status:
    | 'validated_empirical'
    | 'user_validated_prior'
    | 'estimated_unvalidated';
  readonly notes?: string;
}

// Pricing table. Update only when empirical validation confirms a delta.
export const AIRROI_ENDPOINTS: Record<AirroiEndpointKey, AirroiEndpointSpec> = {
  markets_search: {
    method: 'GET',
    path: '/markets/search',
    estimated_cost_usd: 0.1,
    validation_status: 'validated_empirical',
    notes: 'Returns entries[] with country/region/locality/district + active_listings_count.',
  },
  markets_summary: {
    method: 'POST',
    path: '/markets/summary',
    estimated_cost_usd: 0.1,
    validation_status: 'user_validated_prior',
  },
  markets_metrics_all: {
    method: 'POST',
    path: '/markets/metrics/all',
    estimated_cost_usd: 0.5,
    validation_status: 'user_validated_prior',
    notes:
      'Time-series num_months 1-60. Primary source para str_monthly_snapshots por zona (agregado).',
  },
  markets_active_listings: {
    method: 'POST',
    path: '/markets/active_listings',
    estimated_cost_usd: 0.1,
    validation_status: 'estimated_unvalidated',
  },
  markets_occupancy: {
    method: 'POST',
    path: '/markets/occupancy',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  markets_adr: {
    method: 'POST',
    path: '/markets/adr',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  markets_revpar: {
    method: 'POST',
    path: '/markets/revpar',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  markets_revenue: {
    method: 'POST',
    path: '/markets/revenue',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  markets_future_pacing: {
    method: 'POST',
    path: '/markets/future_pacing',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  markets_lead_time: {
    method: 'POST',
    path: '/markets/lead_time',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  markets_los: {
    method: 'POST',
    path: '/markets/los',
    estimated_cost_usd: 0.25,
    validation_status: 'estimated_unvalidated',
  },
  listings_search_market: {
    method: 'POST',
    path: '/listings/search/market',
    estimated_cost_usd: 0.5,
    validation_status: 'validated_empirical',
    notes: 'page_size HARD CAP=10, paginación offset-based. Para bulk usar MCP export_market.',
  },
  listings_search_radius: {
    method: 'POST',
    path: '/listings/search/radius',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  listings_search_polygon: {
    method: 'POST',
    path: '/listings/search/polygon',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  listings_get: {
    method: 'GET',
    path: '/listings/{id}',
    estimated_cost_usd: 0.1,
    validation_status: 'estimated_unvalidated',
  },
  listings_metrics: {
    method: 'POST',
    path: '/listings/metrics',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  listings_future_rates: {
    method: 'POST',
    path: '/listings/future_rates',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  listings_estimate_revenue: {
    method: 'POST',
    path: '/listings/estimate_revenue',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  listings_find_comparables: {
    method: 'POST',
    path: '/listings/find_comparables',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  listings_batch: {
    method: 'POST',
    path: '/listings/batch',
    estimated_cost_usd: 0.5,
    validation_status: 'estimated_unvalidated',
  },
  mcp_export_market: {
    method: 'MCP',
    path: 'airroi_export_market',
    estimated_cost_usd: 2,
    validation_status: 'estimated_unvalidated',
    notes:
      'MCP-only tool. Handles pagination internally. Costo estimado conservador; primera corrida 7b.A.2 contra Roma Sur (1051 listings) consolida el valor y dispara recordSpend exacto.',
  },
};

// Hard page size cap observed on listings/search/market. Usar en cálculos
// de pre-check para estimar número de calls cuando el flow requiera bulk.
export const AIRROI_SEARCH_MAX_PAGE_SIZE = 10;

// Monthly budget cap documentado en ADR-019 §2.6 y aplicado vía
// api_budgets.airroi.monthly_budget_usd=500 en BD (seed FASE 07b.A.2).
export const AIRROI_MONTHLY_BUDGET_USD = 500;

export const AIRROI_ALERT_THRESHOLD_PCT = 80;
export const AIRROI_HARD_LIMIT_PCT = 100;

// Helper: estimate cost for a REST bulk strategy over listings/search/market.
// Útil para decidir MCP vs REST antes de runtime.
export function estimateBulkRestCostUsd(totalListings: number): number {
  const calls = Math.ceil(totalListings / AIRROI_SEARCH_MAX_PAGE_SIZE);
  return calls * AIRROI_ENDPOINTS.listings_search_market.estimated_cost_usd;
}

export function recommendBulkStrategy(totalListings: number): 'rest' | 'mcp' {
  const restCost = estimateBulkRestCostUsd(totalListings);
  const mcpCost = AIRROI_ENDPOINTS.mcp_export_market.estimated_cost_usd;
  return restCost > mcpCost * 2 ? 'mcp' : 'rest';
}
