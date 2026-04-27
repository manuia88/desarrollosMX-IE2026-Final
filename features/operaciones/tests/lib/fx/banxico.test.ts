import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBanxicoMxnUsd } from '../../../lib/fx/banxico';

const ORIG_TOKEN = process.env.BANXICO_TOKEN;

beforeEach(() => {
  process.env.BANXICO_TOKEN = 'test-token';
});

afterEach(() => {
  if (ORIG_TOKEN === undefined) delete process.env.BANXICO_TOKEN;
  else process.env.BANXICO_TOKEN = ORIG_TOKEN;
  vi.restoreAllMocks();
});

function mockFetchOk(payload: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response) as unknown as typeof fetch;
}

function mockFetchFail(status: number): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  } as Response) as unknown as typeof fetch;
}

describe('getBanxicoMxnUsd', () => {
  it('parses last datos entry from SF43718 series', async () => {
    const fetchImpl = mockFetchOk({
      bmx: {
        series: [
          {
            idSerie: 'SF43718',
            titulo: 'Tipo de cambio Pesos por dólar E.U.A.',
            datos: [
              { fecha: '25/04/2026', dato: '17.4200' },
              { fecha: '26/04/2026', dato: '17.4800' },
            ],
          },
        ],
      },
    });
    const rate = await getBanxicoMxnUsd({ fetchImpl });
    expect(rate).toBeCloseTo(17.48, 4);
  });

  it('uses /datos/oportuno when no date provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bmx: { series: [{ idSerie: 'SF43718', datos: [{ fecha: '26/04/2026', dato: '17.50' }] }] },
      }),
    } as Response) as unknown as typeof fetch;
    await getBanxicoMxnUsd({ fetchImpl });
    const calledUrl = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain('/SF43718/datos/oportuno');
  });

  it('uses date range when date provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bmx: { series: [{ idSerie: 'SF43718', datos: [{ fecha: '15/03/2026', dato: '17.10' }] }] },
      }),
    } as Response) as unknown as typeof fetch;
    await getBanxicoMxnUsd({ fetchImpl, date: new Date('2026-03-15T00:00:00Z') });
    const calledUrl = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[0] as string;
    expect(calledUrl).toContain('/SF43718/datos/2026-03-15/2026-03-15');
  });

  it('throws when BANXICO_TOKEN is missing', async () => {
    delete process.env.BANXICO_TOKEN;
    await expect(getBanxicoMxnUsd({ fetchImpl: mockFetchOk({}) })).rejects.toThrow(/BANXICO_TOKEN/);
  });

  it('throws on non-ok HTTP response', async () => {
    await expect(getBanxicoMxnUsd({ fetchImpl: mockFetchFail(503) })).rejects.toThrow(
      /banxico_http_503/,
    );
  });

  it('throws when datos is empty', async () => {
    const fetchImpl = mockFetchOk({
      bmx: { series: [{ idSerie: 'SF43718', datos: [] }] },
    });
    await expect(getBanxicoMxnUsd({ fetchImpl })).rejects.toThrow(/banxico_invalid_value/);
  });

  it('throws when dato is N/E', async () => {
    const fetchImpl = mockFetchOk({
      bmx: { series: [{ idSerie: 'SF43718', datos: [{ fecha: '26/04/2026', dato: 'N/E' }] }] },
    });
    await expect(getBanxicoMxnUsd({ fetchImpl })).rejects.toThrow(/banxico_invalid_value/);
  });

  it('sends Bmx-Token header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bmx: { series: [{ idSerie: 'SF43718', datos: [{ fecha: '26/04/2026', dato: '17.5' }] }] },
      }),
    } as Response) as unknown as typeof fetch;
    await getBanxicoMxnUsd({ fetchImpl });
    const headers = (
      (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[1] as RequestInit
    ).headers as Record<string, string>;
    expect(headers['Bmx-Token']).toBe('test-token');
  });
});
