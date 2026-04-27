import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOpenExchangeRate } from '../../../lib/fx/openexchangerates';

const ORIG_APP_ID = process.env.OPEN_EXCHANGE_RATES_APP_ID;

beforeEach(() => {
  process.env.OPEN_EXCHANGE_RATES_APP_ID = 'test-app-id';
});

afterEach(() => {
  if (ORIG_APP_ID === undefined) delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
  else process.env.OPEN_EXCHANGE_RATES_APP_ID = ORIG_APP_ID;
  vi.restoreAllMocks();
});

function mockFetchOk(payload: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response) as unknown as typeof fetch;
}

describe('getOpenExchangeRate', () => {
  it('returns 1 when from === to without calling fetch', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const rate = await getOpenExchangeRate('USD', 'USD', { fetchImpl });
    expect(rate).toBe(1);
    expect((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(0);
  });

  it('returns direct rate when from === base USD', async () => {
    const fetchImpl = mockFetchOk({
      base: 'USD',
      timestamp: 1714000000,
      rates: { MXN: 17.42, EUR: 0.92 },
    });
    const rate = await getOpenExchangeRate('USD', 'MXN', { fetchImpl });
    expect(rate).toBeCloseTo(17.42, 4);
  });

  it('returns inverse rate when to === base USD', async () => {
    const fetchImpl = mockFetchOk({
      base: 'USD',
      timestamp: 1714000000,
      rates: { MXN: 17.42 },
    });
    const rate = await getOpenExchangeRate('MXN', 'USD', { fetchImpl });
    expect(rate).toBeCloseTo(1 / 17.42, 6);
  });

  it('computes cross-rate when neither side is base', async () => {
    const fetchImpl = mockFetchOk({
      base: 'USD',
      timestamp: 1714000000,
      rates: { MXN: 17.42, EUR: 0.92 },
    });
    const rate = await getOpenExchangeRate('MXN', 'EUR', { fetchImpl });
    expect(rate).toBeCloseTo(0.92 / 17.42, 6);
  });

  it('throws when OPEN_EXCHANGE_RATES_APP_ID is missing', async () => {
    delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
    await expect(getOpenExchangeRate('USD', 'MXN', { fetchImpl: mockFetchOk({}) })).rejects.toThrow(
      /OPEN_EXCHANGE_RATES_APP_ID/,
    );
  });

  it('throws when app_id is placeholder', async () => {
    process.env.OPEN_EXCHANGE_RATES_APP_ID = 'placeholder';
    await expect(getOpenExchangeRate('USD', 'MXN', { fetchImpl: mockFetchOk({}) })).rejects.toThrow(
      /OPEN_EXCHANGE_RATES_APP_ID/,
    );
  });

  it('throws on non-ok HTTP response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;
    await expect(getOpenExchangeRate('USD', 'MXN', { fetchImpl })).rejects.toThrow(/oer_http_429/);
  });

  it('throws when target currency missing in rates', async () => {
    const fetchImpl = mockFetchOk({
      base: 'USD',
      timestamp: 1714000000,
      rates: { EUR: 0.92 },
    });
    await expect(getOpenExchangeRate('USD', 'XYZ', { fetchImpl })).rejects.toThrow(
      /oer_missing_rate:XYZ/,
    );
  });
});
