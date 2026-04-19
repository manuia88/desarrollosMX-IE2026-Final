// AirROI MCP backend client (FASE 07b / UPGRADE U4).
//
// Hallazgo arquitectónico de U3 (ver airroi-pricing.ts header):
//   /listings/export_market NO existe como REST → 404 en todas las variantes.
//   Es un tool exclusivo del MCP server https://mcp.airroi.com llamado
//   `airroi_export_market`. Para bulk listings (ingesta nightly por colonia)
//   esta es la única vía costo-eficiente: 1 tool call paginado internamente
//   vs. cientos de calls REST a $0.50 c/u.
//
// Este módulo expone un cliente JSON-RPC 2.0 over HTTP minimalista (sin
// dependencia del @modelcontextprotocol/sdk para evitar ampliar el stack
// fuera de docs/00_FOUNDATION/00.2_STACK_Y_CONVENCIONES.md sin ADR).
// Implementa solo el handshake mínimo + tools/call requerido para
// `airroi_export_market`. Si en el futuro se ratifica MCP como pieza
// estructural, ADR-020 abrirá la puerta a adoptar el SDK oficial.
//
// Estrategia de fallback (si MCP falla en runtime):
//   - bulkListingsViaPaginatedRest(): pagination por offsets contra
//     /listings/search/market (page_size=10) con pre-check de costo total
//     antes de iniciar. Si estimateBulkRestCostUsd > $50 → abort con error
//     `airroi_bulk_unaffordable_via_rest`.
//
// El caller (airroi.ts ingestor) debe usar `bulkExportMarket()` que
// internamente intenta MCP primero y cae al fallback REST si:
//   - process.env.AIRROI_MCP_URL no está definido.
//   - MCP devuelve error JSON-RPC.
//   - MCP timeout (>30s default).
//
// Validación prod: el primer call real contra mcp.airroi.com consolidará
// el costo en airroi-pricing.ts (mcp_export_market.estimated_cost_usd) y
// confirmará que el client funciona desde Vercel Functions (Fluid Compute
// Node runtime). Tracking en commit message del primer ingest job.

import type { AirroiClient, AirroiMarketIdentifier } from './airroi-client';
import {
  AIRROI_ENDPOINTS,
  AIRROI_MCP_URL,
  AIRROI_SEARCH_MAX_PAGE_SIZE,
  estimateBulkRestCostUsd,
} from './airroi-pricing';
import { logAirroiCall, preCheckAirroiEndpoint } from './airroi-spend-logger';

const DEFAULT_MCP_TIMEOUT_MS = 30_000;
const REST_FALLBACK_HARD_CAP_USD = 50;

export class AirroiMcpError extends Error {
  readonly code = 'airroi_mcp_error' as const;
  constructor(
    message: string,
    public readonly httpStatus: number | undefined,
    public readonly rpcError: unknown,
  ) {
    super(message);
    this.name = 'AirroiMcpError';
  }
}

export class AirroiBulkUnaffordableError extends Error {
  readonly code = 'airroi_bulk_unaffordable_via_rest' as const;
  constructor(
    message: string,
    public readonly estimatedCostUsd: number,
    public readonly hardCapUsd: number,
  ) {
    super(message);
    this.name = 'AirroiBulkUnaffordableError';
  }
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface BulkExportOptions {
  market: AirroiMarketIdentifier;
  runId?: string | undefined;
  countryCode?: string | undefined;
  // Solo para tests / dry runs.
  fetchImpl?: typeof fetch;
  // Permite forzar la estrategia (default: 'auto' decide por env + cap).
  strategy?: 'auto' | 'mcp_only' | 'rest_only';
  mcpUrl?: string | undefined;
  apiKey?: string | undefined;
  timeoutMs?: number;
  // Para fallback paginated REST: cliente AirROI ya inicializado.
  restClient?: AirroiClient;
}

export interface BulkExportResult {
  source: 'mcp' | 'rest';
  market: AirroiMarketIdentifier;
  listings: unknown[];
  total_count: number;
  pages_fetched: number;
  estimated_cost_usd: number;
  duration_ms: number;
  mcp_request_id?: string | undefined;
}

interface McpToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

interface McpToolsCallResult {
  content?: Array<
    | { type: 'text'; text: string }
    | { type: 'json'; json: unknown }
    | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string } }
  >;
  isError?: boolean;
  structuredContent?: unknown;
  // El servidor AirROI puede exponer el payload directamente; lo cubrimos por shape.
  listings?: unknown[];
  total_count?: number;
}

async function callMcpTool(opts: {
  url: string;
  apiKey: string;
  toolName: string;
  args: Record<string, unknown>;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<{ result: McpToolsCallResult; requestId: string | undefined; httpStatus: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: opts.toolName,
      arguments: opts.args,
    } satisfies McpToolsCallParams,
  };

  let response: Response;
  try {
    response = await opts.fetchImpl(opts.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${opts.apiKey}`,
        'X-API-KEY': opts.apiKey,
      },
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(timer);
  }

  const requestId =
    response.headers.get('mcp-request-id') ?? response.headers.get('x-amzn-requestid') ?? undefined;

  if (!response.ok) {
    const text = await response.text();
    throw new AirroiMcpError(
      `MCP HTTP ${response.status}: ${text.slice(0, 200)}`,
      response.status,
      text,
    );
  }

  const json = (await response.json()) as JsonRpcResponse<McpToolsCallResult>;
  if (json.error) {
    throw new AirroiMcpError(`MCP rpc error: ${json.error.message}`, response.status, json.error);
  }
  if (!json.result) {
    throw new AirroiMcpError('MCP empty result', response.status, json);
  }
  if (json.result.isError) {
    throw new AirroiMcpError('MCP tool isError=true', response.status, json.result);
  }

  return { result: json.result, requestId, httpStatus: response.status };
}

function extractListingsFromMcpResult(result: McpToolsCallResult): {
  listings: unknown[];
  total_count: number;
} {
  // Caso 1: structuredContent con shape {listings, total_count}.
  if (
    result.structuredContent &&
    typeof result.structuredContent === 'object' &&
    'listings' in (result.structuredContent as Record<string, unknown>)
  ) {
    const sc = result.structuredContent as { listings: unknown[]; total_count?: number };
    return {
      listings: Array.isArray(sc.listings) ? sc.listings : [],
      total_count: typeof sc.total_count === 'number' ? sc.total_count : sc.listings.length,
    };
  }
  // Caso 2: top-level listings (non-spec, pero algunos servers lo exponen).
  if (Array.isArray(result.listings)) {
    return {
      listings: result.listings,
      total_count: result.total_count ?? result.listings.length,
    };
  }
  // Caso 3: content[] con un text que es JSON serializado.
  if (Array.isArray(result.content)) {
    for (const part of result.content) {
      if (part.type === 'text' && typeof part.text === 'string') {
        try {
          const parsed = JSON.parse(part.text) as { listings?: unknown[]; total_count?: number };
          if (Array.isArray(parsed.listings)) {
            return {
              listings: parsed.listings,
              total_count: parsed.total_count ?? parsed.listings.length,
            };
          }
        } catch {
          // ignore JSON parse error.
        }
      }
      if (part.type === 'json' && part.json && typeof part.json === 'object') {
        const j = part.json as { listings?: unknown[]; total_count?: number };
        if (Array.isArray(j.listings)) {
          return {
            listings: j.listings,
            total_count: j.total_count ?? j.listings.length,
          };
        }
      }
    }
  }
  return { listings: [], total_count: 0 };
}

export async function bulkExportViaMcp(opts: BulkExportOptions): Promise<BulkExportResult> {
  const baseUrl = (opts.mcpUrl ?? process.env.AIRROI_MCP_URL ?? AIRROI_MCP_URL).replace(/\/$/, '');
  const url = `${baseUrl}/mcp`;
  const apiKey = opts.apiKey ?? process.env.AIRROI_API_KEY;
  if (!apiKey) {
    throw new AirroiMcpError('AIRROI_API_KEY missing for MCP call', undefined, null);
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_MCP_TIMEOUT_MS;

  await preCheckAirroiEndpoint('mcp_export_market');

  const startedAt = Date.now();
  let mcpRequestId: string | undefined;
  let httpStatus: number | undefined;
  try {
    const {
      result,
      requestId,
      httpStatus: status,
    } = await callMcpTool({
      url,
      apiKey,
      toolName: 'airroi_export_market',
      args: {
        market: opts.market,
      },
      fetchImpl,
      timeoutMs,
    });
    mcpRequestId = requestId;
    httpStatus = status;
    const { listings, total_count } = extractListingsFromMcpResult(result);
    const durationMs = Date.now() - startedAt;

    await logAirroiCall({
      endpointKey: 'mcp_export_market',
      runId: opts.runId,
      countryCode: opts.countryCode,
      marketRef: describeMarket(opts.market),
      airroiRequestId: mcpRequestId,
      httpStatus,
      durationMs,
      ok: true,
      meta: { listings_count: listings.length, total_count },
    });

    return {
      source: 'mcp',
      market: opts.market,
      listings,
      total_count,
      pages_fetched: 1,
      estimated_cost_usd: AIRROI_ENDPOINTS.mcp_export_market.estimated_cost_usd,
      duration_ms: durationMs,
      ...(mcpRequestId !== undefined ? { mcp_request_id: mcpRequestId } : {}),
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    await logAirroiCall({
      endpointKey: 'mcp_export_market',
      runId: opts.runId,
      countryCode: opts.countryCode,
      marketRef: describeMarket(opts.market),
      airroiRequestId: mcpRequestId,
      httpStatus,
      durationMs,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function bulkListingsViaPaginatedRest(opts: {
  market: AirroiMarketIdentifier;
  client: AirroiClient;
  expectedTotalListings?: number;
  hardCapUsd?: number;
}): Promise<BulkExportResult> {
  const expected = opts.expectedTotalListings ?? 100;
  const cap = opts.hardCapUsd ?? REST_FALLBACK_HARD_CAP_USD;
  const estimated = estimateBulkRestCostUsd(expected);
  if (estimated > cap) {
    throw new AirroiBulkUnaffordableError(
      `Bulk REST cost estimate $${estimated.toFixed(2)} > hard cap $${cap.toFixed(2)} for ${expected} listings`,
      estimated,
      cap,
    );
  }

  const startedAt = Date.now();
  const all: unknown[] = [];
  let pages = 0;
  let offset = 0;
  let total = expected;
  // Usa AIRROI_SEARCH_MAX_PAGE_SIZE (10) — cap impuesto por API.
  const perCallCost = AIRROI_ENDPOINTS.listings_search_market.estimated_cost_usd;
  while (offset < total) {
    // Cap proyectado: aborta antes de la siguiente llamada si excedería.
    const projectedCost = (pages + 1) * perCallCost;
    if (projectedCost > cap) break;
    pages += 1;
    const page = await opts.client.listingsSearchMarket(opts.market, {
      pageSize: AIRROI_SEARCH_MAX_PAGE_SIZE,
      offset,
    });
    const results = Array.isArray(page.data?.results) ? page.data.results : [];
    all.push(...results);
    if (page.data?.pagination?.total_count != null) {
      total = page.data.pagination.total_count;
    }
    if (results.length === 0) break;
    offset += AIRROI_SEARCH_MAX_PAGE_SIZE;
  }

  const durationMs = Date.now() - startedAt;
  const estimatedCost = pages * AIRROI_ENDPOINTS.listings_search_market.estimated_cost_usd;
  return {
    source: 'rest',
    market: opts.market,
    listings: all,
    total_count: total,
    pages_fetched: pages,
    estimated_cost_usd: estimatedCost,
    duration_ms: durationMs,
  };
}

export async function bulkExportMarket(opts: BulkExportOptions): Promise<BulkExportResult> {
  const strategy = opts.strategy ?? 'auto';
  if (strategy === 'rest_only') {
    if (!opts.restClient) {
      throw new Error('bulkExportMarket: rest_only requires opts.restClient');
    }
    return bulkListingsViaPaginatedRest({
      market: opts.market,
      client: opts.restClient,
    });
  }
  if (strategy === 'mcp_only') {
    return bulkExportViaMcp(opts);
  }
  // strategy === 'auto'
  const mcpUrl = opts.mcpUrl ?? process.env.AIRROI_MCP_URL;
  if (!mcpUrl) {
    if (!opts.restClient) {
      throw new Error(
        'bulkExportMarket: AIRROI_MCP_URL not set and no restClient fallback provided.',
      );
    }
    return bulkListingsViaPaginatedRest({
      market: opts.market,
      client: opts.restClient,
    });
  }
  try {
    return await bulkExportViaMcp(opts);
  } catch (err) {
    if (err instanceof AirroiMcpError && opts.restClient) {
      return bulkListingsViaPaginatedRest({
        market: opts.market,
        client: opts.restClient,
      });
    }
    throw err;
  }
}

function describeMarket(m: AirroiMarketIdentifier): string {
  return m.district ? `${m.district}, ${m.locality}` : m.locality;
}
