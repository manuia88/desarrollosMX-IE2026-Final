import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/currency/fx', () => ({
  convert: vi.fn(),
  getLatestRate: vi.fn(),
}));

import { convert, getLatestRate } from '@/shared/lib/currency/fx';
import { convertForOperacion, getFxRateForOperacion } from '../../lib/fx-rate';

const mockedGetLatestRate = vi.mocked(getLatestRate);
const mockedConvert = vi.mocked(convert);

describe('getFxRateForOperacion', () => {
  it('returns 1 when from === to', async () => {
    const result = await getFxRateForOperacion('MXN', 'MXN');
    expect(result.rate).toBe(1);
    expect(result.source).toBe('live');
  });

  it('returns live rate when available', async () => {
    mockedGetLatestRate.mockResolvedValueOnce(17.5);
    const result = await getFxRateForOperacion('USD', 'MXN');
    expect(result.rate).toBe(17.5);
    expect(result.source).toBe('live');
  });

  it('falls back to hardcoded USD-MXN when live is null', async () => {
    mockedGetLatestRate.mockResolvedValueOnce(null);
    const result = await getFxRateForOperacion('USD', 'MXN');
    expect(result.rate).toBeCloseTo(17.05, 2);
    expect(result.source).toBe('fallback');
  });

  it('throws when no live rate and no fallback for pair', async () => {
    mockedGetLatestRate.mockResolvedValueOnce(null);
    await expect(getFxRateForOperacion('COP', 'BRL')).rejects.toThrow(/No FX rate/);
  });
});

describe('convertForOperacion', () => {
  it('returns same amount when from === to', async () => {
    const result = await convertForOperacion(100, 'MXN', 'MXN');
    expect(result.amount).toBe(100);
    expect(result.rate).toBe(1);
  });

  it('uses live convert when available', async () => {
    mockedConvert.mockResolvedValueOnce(1750);
    const result = await convertForOperacion(100, 'USD', 'MXN');
    expect(result.amount).toBe(1750);
    expect(result.source).toBe('live');
  });

  it('falls back to hardcoded MXN-USD when live null', async () => {
    mockedConvert.mockResolvedValueOnce(null);
    const result = await convertForOperacion(1705, 'MXN', 'USD');
    expect(result.source).toBe('fallback');
    expect(result.amount).toBeCloseTo(100, 0);
  });
});
