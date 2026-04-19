import { AIRROI_BASE_URL, AIRROI_ENDPOINTS, type AirroiEndpointKey } from './airroi-pricing';
import { logAirroiCall, preCheckAirroiEndpoint } from './airroi-spend-logger';

// AirROI REST client.
//
// Todas las calls pasan por este wrapper para garantizar:
//   1. Pre-check de budget antes del fetch (BudgetExceededError si exceso).
//   2. Log granular en airroi_spend_ledger + increment api_budgets.
//   3. Captura de x-amzn-requestid para U6 provenance.
//   4. Typed responses con Zod para el subset que usamos.
//
// Para bulk listings ver `shared/lib/ingest/str/airroi-mcp.ts` (U4), que usa
// el MCP server. Este módulo expone solo REST (para backends donde MCP no
// esté disponible, o como fallback determinista).

export interface AirroiMarketIdentifier {
  country: string; // "Mexico"
  region: string; // "Ciudad de México"
  locality: string; // "Mexico City"
  district?: string; // "Roma Sur" (opcional)
}

export interface AirroiMarketSearchEntry {
  full_name: string;
  country: string;
  region: string;
  locality: string;
  district: string | null;
  native_currency: string;
  active_listings_count: number;
}

export interface AirroiPagination {
  total_count: number;
  page_size: number;
  offset: number;
}

export interface AirroiCallResult<T> {
  data: T;
  requestId: string | undefined;
  httpStatus: number;
  durationMs: number;
}

export interface AirroiClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  // Context propagado a cada log entry.
  runId?: string | undefined;
  countryCode?: string | undefined;
}

export class AirroiHttpError extends Error {
  readonly code = 'airroi_http_error' as const;
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId: string | undefined,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'AirroiHttpError';
  }
}

export class AirroiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly runId: string | undefined;
  private readonly countryCode: string | undefined;

  constructor(opts: AirroiClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? AIRROI_BASE_URL;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.runId = opts.runId;
    this.countryCode = opts.countryCode;
  }

  private async call<T>(
    endpointKey: AirroiEndpointKey,
    init: { method: 'GET' | 'POST'; path: string; body?: unknown; marketRef?: string },
  ): Promise<AirroiCallResult<T>> {
    await preCheckAirroiEndpoint(endpointKey);

    const url = `${this.baseUrl}${init.path}`;
    const headers: Record<string, string> = {
      'X-API-KEY': this.apiKey,
    };
    if (init.method === 'POST') headers['Content-Type'] = 'application/json';

    const startedAt = Date.now();
    let response: Response;
    let requestId: string | undefined;
    let httpStatus = 0;
    try {
      const reqInit: RequestInit = { method: init.method, headers };
      if (init.body != null) reqInit.body = JSON.stringify(init.body);
      response = await this.fetchImpl(url, reqInit);
      httpStatus = response.status;
      requestId = response.headers.get('x-amzn-requestid') ?? undefined;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      await logAirroiCall({
        endpointKey,
        runId: this.runId,
        countryCode: this.countryCode,
        marketRef: init.marketRef,
        durationMs,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const durationMs = Date.now() - startedAt;
    const bodyText = await response.text();
    let bodyJson: unknown;
    try {
      bodyJson = bodyText.length > 0 ? JSON.parse(bodyText) : null;
    } catch {
      bodyJson = { raw: bodyText };
    }

    if (!response.ok) {
      await logAirroiCall({
        endpointKey,
        runId: this.runId,
        countryCode: this.countryCode,
        marketRef: init.marketRef,
        airroiRequestId: requestId,
        httpStatus,
        durationMs,
        ok: false,
        error: `HTTP ${httpStatus}`,
        meta: { body: bodyJson },
      });
      throw new AirroiHttpError(
        `AirROI ${init.method} ${init.path} → HTTP ${httpStatus}`,
        httpStatus,
        requestId,
        bodyJson,
      );
    }

    await logAirroiCall({
      endpointKey,
      runId: this.runId,
      countryCode: this.countryCode,
      marketRef: init.marketRef,
      airroiRequestId: requestId,
      httpStatus,
      durationMs,
      ok: true,
    });

    return {
      data: bodyJson as T,
      requestId,
      httpStatus,
      durationMs,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Markets
  // ──────────────────────────────────────────────────────────────────────

  async searchMarkets(
    query: string,
  ): Promise<AirroiCallResult<{ entries: AirroiMarketSearchEntry[] }>> {
    const spec = AIRROI_ENDPOINTS.markets_search;
    const path = `${spec.path}?query=${encodeURIComponent(query)}`;
    return this.call('markets_search', {
      method: spec.method as 'GET',
      path,
      marketRef: query,
    });
  }

  async marketSummary(
    market: AirroiMarketIdentifier,
    opts: { currency?: 'usd' | 'native' } = {},
  ): Promise<AirroiCallResult<unknown>> {
    const spec = AIRROI_ENDPOINTS.markets_summary;
    return this.call('markets_summary', {
      method: spec.method as 'POST',
      path: spec.path,
      body: { market, currency: opts.currency ?? 'native' },
      marketRef: describeMarket(market),
    });
  }

  async marketMetricsAll(
    market: AirroiMarketIdentifier,
    opts: { numMonths?: number; currency?: 'usd' | 'native' } = {},
  ): Promise<AirroiCallResult<unknown>> {
    const spec = AIRROI_ENDPOINTS.markets_metrics_all;
    return this.call('markets_metrics_all', {
      method: spec.method as 'POST',
      path: spec.path,
      body: {
        market,
        num_months: opts.numMonths ?? 12,
        currency: opts.currency ?? 'native',
      },
      marketRef: describeMarket(market),
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Listings
  // ──────────────────────────────────────────────────────────────────────

  async listingsSearchMarket(
    market: AirroiMarketIdentifier,
    opts: { pageSize?: number; offset?: number; currency?: 'usd' | 'native' } = {},
  ): Promise<AirroiCallResult<{ pagination: AirroiPagination; results: unknown[] }>> {
    const spec = AIRROI_ENDPOINTS.listings_search_market;
    const pageSize = Math.min(opts.pageSize ?? 10, 10); // AIRROI_SEARCH_MAX_PAGE_SIZE
    return this.call('listings_search_market', {
      method: spec.method as 'POST',
      path: spec.path,
      body: {
        market,
        currency: opts.currency ?? 'native',
        pagination: { page_size: pageSize, offset: opts.offset ?? 0 },
      },
      marketRef: describeMarket(market),
    });
  }
}

function describeMarket(m: AirroiMarketIdentifier): string {
  return m.district ? `${m.district}, ${m.locality}` : m.locality;
}

export function createAirroiClient(
  opts: Omit<AirroiClientOptions, 'apiKey'> & { apiKey?: string } = {},
): AirroiClient {
  const apiKey = opts.apiKey ?? process.env.AIRROI_API_KEY;
  if (!apiKey) {
    throw new Error('AIRROI_API_KEY missing. Export in .env.local or pass explicitly.');
  }
  return new AirroiClient({ ...opts, apiKey });
}
