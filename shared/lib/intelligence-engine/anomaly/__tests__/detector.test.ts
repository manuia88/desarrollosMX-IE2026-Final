import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { computeBaselineStats, detectAndRecordAnomaly, shouldFlagAnomaly } from '../detector';

describe('computeBaselineStats', () => {
  it('0 samples → zeros', () => {
    expect(computeBaselineStats([])).toEqual({ mean: 0, stddev: 0, samples: 0 });
  });

  it('1 sample → mean ok, stddev 0', () => {
    expect(computeBaselineStats([50])).toEqual({ mean: 50, stddev: 0, samples: 1 });
  });

  it('30 samples uniformes → mean correcto, stddev bajo', () => {
    const values = Array.from({ length: 30 }, () => 80);
    const stats = computeBaselineStats(values);
    expect(stats.mean).toBe(80);
    expect(stats.stddev).toBe(0);
    expect(stats.samples).toBe(30);
  });

  it('muestras dispersas → stddev > 0', () => {
    const stats = computeBaselineStats([70, 75, 80, 85, 90]);
    expect(stats.mean).toBe(80);
    expect(stats.stddev).toBeGreaterThan(0);
  });
});

describe('shouldFlagAnomaly', () => {
  it('menos de MIN_SAMPLES → null', () => {
    const result = shouldFlagAnomaly(100, { mean: 50, stddev: 5, samples: 3 });
    expect(result).toBeNull();
  });

  it('stddev=0 → null (no variabilidad medible)', () => {
    expect(shouldFlagAnomaly(95, { mean: 80, stddev: 0, samples: 30 })).toBeNull();
  });

  it('deviation <= 3σ → detected=false', () => {
    const result = shouldFlagAnomaly(83, { mean: 80, stddev: 2, samples: 30 });
    expect(result).not.toBeNull();
    expect(result?.detected).toBe(false);
  });

  it('deviation > 3σ → detected=true', () => {
    const result = shouldFlagAnomaly(95, { mean: 80, stddev: 2, samples: 30 });
    expect(result).not.toBeNull();
    expect(result?.detected).toBe(true);
    expect(result?.deviation_sigma).toBeGreaterThan(3);
  });
});

describe('detectAndRecordAnomaly (integration)', () => {
  it('30 valores ~80 + nuevo 95 outlier → INSERT en market_anomalies', async () => {
    const historyValues = Array.from({ length: 30 }, (_, i) => 78 + (i % 5));
    const insertSpy = vi.fn(async () => ({ error: null }));
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) })),
    }));

    const from = vi.fn((table: string) => {
      if (table === 'score_history') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    limit: vi.fn(async () => ({
                      data: historyValues.map((v) => ({ score_value: v })),
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'market_anomalies') {
        return { insert: insertSpy };
      }
      return { update: updateSpy };
    });
    const supabase = { from } as unknown as SupabaseClient;

    const result = await detectAndRecordAnomaly(supabase, {
      scoreId: 'F01',
      entityType: 'zone',
      entityId: '11111111-1111-1111-1111-111111111111',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      currentValue: 95,
    });

    expect(result.marker).not.toBeNull();
    expect(result.marker?.detected).toBe(true);
    expect(result.persisted).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it('valor dentro del rango → no insert', async () => {
    const historyValues = Array.from({ length: 30 }, () => 80);
    const insertSpy = vi.fn(async () => ({ error: null }));
    const from = vi.fn((table: string) => {
      if (table === 'score_history') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    limit: vi.fn(async () => ({
                      data: historyValues.map((v) => ({ score_value: v })),
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      return { insert: insertSpy };
    });
    const supabase = { from } as unknown as SupabaseClient;

    const result = await detectAndRecordAnomaly(supabase, {
      scoreId: 'F01',
      entityType: 'zone',
      entityId: '11111111-1111-1111-1111-111111111111',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      currentValue: 80,
    });

    // Sin variabilidad (stddev=0) → marker null
    expect(result.marker).toBeNull();
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
