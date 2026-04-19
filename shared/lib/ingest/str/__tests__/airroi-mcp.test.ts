import { describe, expect, it, vi } from 'vitest';
import type { AirroiClient } from '../airroi-client';
import {
  AirroiBulkUnaffordableError,
  AirroiMcpError,
  bulkExportMarket,
  bulkExportViaMcp,
  bulkListingsViaPaginatedRest,
} from '../airroi-mcp';

vi.mock('../airroi-spend-logger', () => ({
  preCheckAirroiEndpoint: vi.fn().mockResolvedValue(undefined),
  logAirroiCall: vi.fn().mockResolvedValue(undefined),
}));

const market = {
  country: 'Mexico',
  region: 'Ciudad de México',
  locality: 'Mexico City',
  district: 'Roma Sur',
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('bulkExportViaMcp', () => {
  it('parsea structuredContent con listings + total_count', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          jsonrpc: '2.0',
          id: 1,
          result: {
            structuredContent: {
              listings: [{ id: 'L1' }, { id: 'L2' }],
              total_count: 2,
            },
          },
        },
        200,
        { 'mcp-request-id': 'req-abc' },
      ),
    );

    const result = await bulkExportViaMcp({
      market,
      apiKey: 'test-key',
      mcpUrl: 'https://mcp.airroi.com',
      fetchImpl,
    });

    expect(result.source).toBe('mcp');
    expect(result.listings).toHaveLength(2);
    expect(result.total_count).toBe(2);
    expect(result.mcp_request_id).toBe('req-abc');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const firstCall = fetchImpl.mock.calls[0];
    if (!firstCall) throw new Error('expected at least one fetch call');
    const init = firstCall[1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.method).toBe('tools/call');
    expect(body.params.name).toBe('airroi_export_market');
    expect(body.params.arguments.market).toEqual(market);
  });

  it('parsea content[].text como JSON serializado', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            { type: 'text', text: JSON.stringify({ listings: [{ id: 'L1' }], total_count: 1 }) },
          ],
        },
      }),
    );

    const result = await bulkExportViaMcp({
      market,
      apiKey: 'test',
      mcpUrl: 'https://mcp.airroi.com',
      fetchImpl,
    });
    expect(result.listings).toHaveLength(1);
    expect(result.total_count).toBe(1);
  });

  it('throws AirroiMcpError ante HTTP 500', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('internal', { status: 500 }));
    await expect(
      bulkExportViaMcp({
        market,
        apiKey: 'k',
        mcpUrl: 'https://mcp.airroi.com',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(AirroiMcpError);
  });

  it('throws AirroiMcpError ante rpc error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32601, message: 'Method not found' },
      }),
    );
    await expect(
      bulkExportViaMcp({
        market,
        apiKey: 'k',
        mcpUrl: 'https://mcp.airroi.com',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(AirroiMcpError);
  });

  it('throws ante isError=true', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        jsonrpc: '2.0',
        id: 1,
        result: { isError: true, content: [{ type: 'text', text: 'invalid market' }] },
      }),
    );
    await expect(
      bulkExportViaMcp({
        market,
        apiKey: 'k',
        mcpUrl: 'https://mcp.airroi.com',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(AirroiMcpError);
  });

  it('throws si AIRROI_API_KEY missing', async () => {
    await expect(
      bulkExportViaMcp({
        market,
        mcpUrl: 'https://mcp.airroi.com',
        apiKey: '',
        fetchImpl: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(AirroiMcpError);
  });
});

describe('bulkListingsViaPaginatedRest', () => {
  function fakeClient(pages: Array<{ results: unknown[]; total_count: number }>): AirroiClient {
    let i = 0;
    return {
      listingsSearchMarket: vi.fn().mockImplementation(async () => {
        const page = pages[i++] ?? { results: [], total_count: 0 };
        return {
          data: {
            results: page.results,
            pagination: { total_count: page.total_count, page_size: 10, offset: 0 },
          },
          requestId: 'rid',
          httpStatus: 200,
          durationMs: 10,
        };
      }),
    } as unknown as AirroiClient;
  }

  it('pagina hasta cubrir total_count', async () => {
    const client = fakeClient([
      { results: Array.from({ length: 10 }, (_, i) => ({ id: `L${i}` })), total_count: 25 },
      { results: Array.from({ length: 10 }, (_, i) => ({ id: `L${10 + i}` })), total_count: 25 },
      { results: Array.from({ length: 5 }, (_, i) => ({ id: `L${20 + i}` })), total_count: 25 },
    ]);

    const result = await bulkListingsViaPaginatedRest({
      market,
      client,
      expectedTotalListings: 25,
      hardCapUsd: 50,
    });

    expect(result.source).toBe('rest');
    expect(result.listings).toHaveLength(25);
    expect(result.pages_fetched).toBe(3);
  });

  it('rechaza si costo estimado supera hard cap', async () => {
    const client = fakeClient([{ results: [], total_count: 0 }]);
    await expect(
      bulkListingsViaPaginatedRest({
        market,
        client,
        expectedTotalListings: 5_000, // 500 calls × $0.50 = $250 → > $50 cap.
        hardCapUsd: 50,
      }),
    ).rejects.toBeInstanceOf(AirroiBulkUnaffordableError);
  });

  it('para de paginar al exceder cap durante el loop', async () => {
    // 100 listings → 10 pages × $0.50 = $5 dentro del cap $5.
    // Pero si seguimos paginando, $5.50 ya excede.
    const client = fakeClient(
      Array.from({ length: 12 }, () => ({
        results: Array.from({ length: 10 }, (_, i) => ({ id: `L${i}` })),
        total_count: 200,
      })),
    );
    const result = await bulkListingsViaPaginatedRest({
      market,
      client,
      expectedTotalListings: 100,
      hardCapUsd: 5,
    });
    // Debe parar antes de superar 5 USD ⇒ ≤ 10 pages.
    expect(result.pages_fetched).toBeLessThanOrEqual(10);
    expect(result.estimated_cost_usd).toBeLessThanOrEqual(5);
  });
});

describe('bulkExportMarket strategy=auto', () => {
  it('usa MCP cuando AIRROI_MCP_URL está set y la call funciona', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        jsonrpc: '2.0',
        id: 1,
        result: { structuredContent: { listings: [{ id: 'L1' }], total_count: 1 } },
      }),
    );
    const result = await bulkExportMarket({
      market,
      apiKey: 'k',
      mcpUrl: 'https://mcp.airroi.com',
      fetchImpl,
    });
    expect(result.source).toBe('mcp');
  });

  it('cae a REST si MCP falla y restClient está provisto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('fail', { status: 500 }));
    const restClient = {
      listingsSearchMarket: vi.fn().mockResolvedValue({
        data: { results: [{ id: 'L1' }], pagination: { total_count: 1, page_size: 10, offset: 0 } },
        requestId: 'rid',
        httpStatus: 200,
        durationMs: 10,
      }),
    } as unknown as AirroiClient;

    const result = await bulkExportMarket({
      market,
      apiKey: 'k',
      mcpUrl: 'https://mcp.airroi.com',
      fetchImpl,
      restClient,
    });
    expect(result.source).toBe('rest');
  });

  it('rest_only fuerza paginated REST', async () => {
    const restClient = {
      listingsSearchMarket: vi.fn().mockResolvedValue({
        data: { results: [{ id: 'L1' }], pagination: { total_count: 1, page_size: 10, offset: 0 } },
        requestId: 'rid',
        httpStatus: 200,
        durationMs: 10,
      }),
    } as unknown as AirroiClient;

    const result = await bulkExportMarket({
      market,
      strategy: 'rest_only',
      restClient,
    });
    expect(result.source).toBe('rest');
  });
});
