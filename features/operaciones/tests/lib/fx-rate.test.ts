import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/fx/cascade', () => ({
  getFxRate: vi.fn(),
}));

import { getFxRate } from '../../lib/fx/cascade';
import { convertForOperacion, getFxRateForOperacion } from '../../lib/fx-rate';

const mockedGetFxRate = vi.mocked(getFxRate);

beforeEach(() => {
  mockedGetFxRate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getFxRateForOperacion', () => {
  it('returns 1 when from === to without calling cascade', async () => {
    const result = await getFxRateForOperacion('MXN', 'MXN');
    expect(result.rate).toBe(1);
    expect(result.source).toBe('live');
    expect(mockedGetFxRate).not.toHaveBeenCalled();
  });

  it('maps banxico source to legacy live', async () => {
    mockedGetFxRate.mockResolvedValueOnce({
      rate: 17.42,
      source: 'banxico',
      pair: 'USD-MXN',
    });
    const result = await getFxRateForOperacion('USD', 'MXN');
    expect(result.rate).toBe(17.42);
    expect(result.source).toBe('live');
    expect(result.pair).toBe('USD-MXN');
  });

  it('maps openexchangerates source to legacy live', async () => {
    mockedGetFxRate.mockResolvedValueOnce({
      rate: 0.85,
      source: 'openexchangerates',
      pair: 'USD-EUR',
    });
    const result = await getFxRateForOperacion('USD', 'EUR');
    expect(result.source).toBe('live');
  });

  it('maps fallback source to legacy fallback', async () => {
    mockedGetFxRate.mockResolvedValueOnce({
      rate: 17.5,
      source: 'fallback',
      pair: 'USD-MXN',
    });
    const result = await getFxRateForOperacion('USD', 'MXN');
    expect(result.source).toBe('fallback');
    expect(result.rate).toBe(17.5);
  });

  it('propagates cascade errors when no rate available', async () => {
    mockedGetFxRate.mockRejectedValueOnce(new Error('fx_no_rate_available:COP-BRL'));
    await expect(getFxRateForOperacion('COP', 'BRL')).rejects.toThrow(/fx_no_rate_available/);
  });
});

describe('convertForOperacion', () => {
  it('returns same amount when from === to', async () => {
    const result = await convertForOperacion(100, 'MXN', 'MXN');
    expect(result.amount).toBe(100);
    expect(result.rate).toBe(1);
    expect(mockedGetFxRate).not.toHaveBeenCalled();
  });

  it('multiplies amount by cascade rate (live)', async () => {
    mockedGetFxRate.mockResolvedValueOnce({
      rate: 17.5,
      source: 'banxico',
      pair: 'USD-MXN',
    });
    const result = await convertForOperacion(100, 'USD', 'MXN');
    expect(result.amount).toBe(1750);
    expect(result.source).toBe('live');
    expect(result.rate).toBe(17.5);
  });

  it('multiplies amount by cascade rate (fallback)', async () => {
    mockedGetFxRate.mockResolvedValueOnce({
      rate: 1 / 17.5,
      source: 'fallback',
      pair: 'MXN-USD',
    });
    const result = await convertForOperacion(1750, 'MXN', 'USD');
    expect(result.source).toBe('fallback');
    expect(result.amount).toBeCloseTo(100, 2);
  });
});
