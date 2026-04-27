import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/fx/banxico', () => ({
  getBanxicoMxnUsd: vi.fn(),
}));

vi.mock('../../../lib/fx/openexchangerates', () => ({
  getOpenExchangeRate: vi.fn(),
}));

import { getBanxicoMxnUsd } from '../../../lib/fx/banxico';
import { getFxRate } from '../../../lib/fx/cascade';
import { getOpenExchangeRate } from '../../../lib/fx/openexchangerates';

const mockedBanxico = vi.mocked(getBanxicoMxnUsd);
const mockedOer = vi.mocked(getOpenExchangeRate);

beforeEach(() => {
  mockedBanxico.mockReset();
  mockedOer.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getFxRate cascade priority', () => {
  it('returns rate=1 with banxico source when from === to', async () => {
    const result = await getFxRate('MXN', 'MXN', { skipCache: true });
    expect(result.rate).toBe(1);
    expect(result.source).toBe('banxico');
    expect(mockedBanxico).not.toHaveBeenCalled();
  });

  it('uses Banxico for USD→MXN when available', async () => {
    mockedBanxico.mockResolvedValueOnce(17.42);
    const result = await getFxRate('USD', 'MXN', { skipCache: true });
    expect(result.source).toBe('banxico');
    expect(result.rate).toBeCloseTo(17.42, 4);
    expect(mockedOer).not.toHaveBeenCalled();
  });

  it('uses Banxico inverted for MXN→USD when available', async () => {
    mockedBanxico.mockResolvedValueOnce(17.42);
    const result = await getFxRate('MXN', 'USD', { skipCache: true });
    expect(result.source).toBe('banxico');
    expect(result.rate).toBeCloseTo(1 / 17.42, 6);
  });

  it('skips Banxico for non-MXN/USD pair and uses OER', async () => {
    mockedOer.mockResolvedValueOnce(0.92);
    const result = await getFxRate('USD', 'EUR', { skipCache: true });
    expect(result.source).toBe('openexchangerates');
    expect(result.rate).toBeCloseTo(0.92, 4);
    expect(mockedBanxico).not.toHaveBeenCalled();
  });

  it('falls back to OER when Banxico fails for USD/MXN pair', async () => {
    mockedBanxico.mockRejectedValueOnce(new Error('banxico_http_503'));
    mockedOer.mockResolvedValueOnce(17.55);
    const result = await getFxRate('USD', 'MXN', { skipCache: true });
    expect(result.source).toBe('openexchangerates');
    expect(result.rate).toBeCloseTo(17.55, 4);
  });

  it('falls back to hardcoded 17.5 when both Banxico and OER fail (USD→MXN)', async () => {
    mockedBanxico.mockRejectedValueOnce(new Error('banxico_http_503'));
    mockedOer.mockRejectedValueOnce(new Error('oer_http_429'));
    const result = await getFxRate('USD', 'MXN', { skipCache: true });
    expect(result.source).toBe('fallback');
    expect(result.rate).toBe(17.5);
  });

  it('falls back to hardcoded inverted for MXN→USD when both providers fail', async () => {
    mockedBanxico.mockRejectedValueOnce(new Error('banxico_http_503'));
    mockedOer.mockRejectedValueOnce(new Error('oer_http_429'));
    const result = await getFxRate('MXN', 'USD', { skipCache: true });
    expect(result.source).toBe('fallback');
    expect(result.rate).toBeCloseTo(1 / 17.5, 6);
  });

  it('throws when no provider succeeds and no hardcoded fallback (e.g. COP→BRL)', async () => {
    mockedOer.mockRejectedValueOnce(new Error('oer_http_429'));
    await expect(getFxRate('COP', 'BRL', { skipCache: true })).rejects.toThrow(
      /fx_no_rate_available:COP-BRL/,
    );
  });

  it('reuses cached value across calls (cache hit)', async () => {
    mockedBanxico.mockResolvedValueOnce(17.42);
    const r1 = await getFxRate('USD', 'MXN');
    const r2 = await getFxRate('USD', 'MXN');
    expect(r1.rate).toBe(r2.rate);
    expect(mockedBanxico.mock.calls.length).toBe(1);
  });
});
