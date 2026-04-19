import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPreCheck = vi.fn<(key: string) => Promise<void>>(async () => undefined);
const mockLogCall = vi.fn<(ctx: Record<string, unknown>) => Promise<void>>(async () => undefined);

vi.mock('../airroi-spend-logger', () => ({
  preCheckAirroiEndpoint: (k: string) => mockPreCheck(k),
  logAirroiCall: (ctx: Record<string, unknown>) => mockLogCall(ctx),
}));

// biome-ignore lint/correctness/noUnusedImports: dynamic import after mock.
import { AirroiClient, AirroiHttpError } from '../airroi-client';

describe('AirroiClient', () => {
  beforeEach(() => {
    mockPreCheck.mockClear();
    mockLogCall.mockClear();
  });

  function makeFetch(response: {
    status: number;
    body: unknown;
    requestId?: string;
  }): typeof fetch {
    return (async () =>
      new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          'content-type': 'application/json',
          ...(response.requestId ? { 'x-amzn-requestid': response.requestId } : {}),
        },
      })) as unknown as typeof fetch;
  }

  it('searchMarkets pasa por pre-check, captura requestId y loguea ok=true', async () => {
    const client = new AirroiClient({
      apiKey: 'test-key',
      fetchImpl: makeFetch({
        status: 200,
        body: { entries: [{ full_name: 'Roma Sur...', active_listings_count: 591 }] },
        requestId: 'req-abc',
      }),
    });

    const result = await client.searchMarkets('Roma Sur');

    expect(mockPreCheck).toHaveBeenCalledWith('markets_search');
    expect(result.requestId).toBe('req-abc');
    expect(result.httpStatus).toBe(200);
    expect(mockLogCall).toHaveBeenCalledTimes(1);
    expect(mockLogCall.mock.calls[0]?.[0]).toMatchObject({
      endpointKey: 'markets_search',
      ok: true,
      airroiRequestId: 'req-abc',
    });
  });

  it('listingsSearchMarket clampea page_size a 10 (AirROI cap)', async () => {
    let capturedBody: unknown;
    const fetchImpl: typeof fetch = (async (_url: unknown, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body));
      return new Response(
        JSON.stringify({ pagination: { total_count: 0, page_size: 10, offset: 0 }, results: [] }),
        {
          status: 200,
        },
      );
    }) as unknown as typeof fetch;

    const client = new AirroiClient({ apiKey: 'k', fetchImpl });
    await client.listingsSearchMarket(
      {
        country: 'Mexico',
        region: 'Ciudad de México',
        locality: 'Mexico City',
        district: 'Roma Sur',
      },
      { pageSize: 500 },
    );

    expect(capturedBody).toMatchObject({ pagination: { page_size: 10, offset: 0 } });
  });

  it('lanza AirroiHttpError y loguea ok=false en HTTP 400', async () => {
    const client = new AirroiClient({
      apiKey: 'k',
      fetchImpl: makeFetch({ status: 400, body: { error: 'bad' }, requestId: 'req-err' }),
    });

    await expect(
      client.marketSummary({
        country: 'Mexico',
        region: 'Ciudad de México',
        locality: 'Mexico City',
      }),
    ).rejects.toBeInstanceOf(AirroiHttpError);

    expect(mockLogCall.mock.calls[0]?.[0]).toMatchObject({
      endpointKey: 'markets_summary',
      ok: false,
      httpStatus: 400,
      airroiRequestId: 'req-err',
    });
  });

  it('loguea network error cuando fetch rechaza', async () => {
    const fetchImpl: typeof fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const client = new AirroiClient({ apiKey: 'k', fetchImpl });

    await expect(client.searchMarkets('x')).rejects.toThrow('network down');

    expect(mockLogCall.mock.calls[0]?.[0]).toMatchObject({
      endpointKey: 'markets_search',
      ok: false,
      error: 'network down',
    });
  });

  it('propaga runId y countryCode al logger para cada call', async () => {
    const client = new AirroiClient({
      apiKey: 'k',
      runId: 'run-xyz',
      countryCode: 'MX',
      fetchImpl: makeFetch({ status: 200, body: { entries: [] } }),
    });

    await client.searchMarkets('test');

    expect(mockLogCall.mock.calls[0]?.[0]).toMatchObject({
      runId: 'run-xyz',
      countryCode: 'MX',
    });
  });
});
