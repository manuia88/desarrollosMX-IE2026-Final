// F14.F.10 Sprint 9 BIBLIA — Tests m09-photographer-metrics cross-function.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/photographer-metrics-cross-feature', () => ({
  getPhotographerKpis: vi.fn(),
  aggregatePhotographerStats: vi.fn(),
}));

import {
  aggregatePhotographerStats,
  getPhotographerKpis,
} from '@/shared/lib/photographer-metrics-cross-feature';
import { getPhotographerKpisDigest, getPhotographerKpisRange } from '../m09-photographer-metrics';

describe('photographer/cross-functions/m09-photographer-metrics', () => {
  it('getPhotographerKpisDigest devuelve shape canon 5 KPIs', async () => {
    vi.mocked(getPhotographerKpis).mockResolvedValue({
      clientsActive: 4,
      clientsTotal: 10,
      videosGenerated: 42,
      revenueEstUsd: 1500,
      commissionEarnedUsd: 67,
      ratingAvg: 4.7,
    });

    const result = await getPhotographerKpisDigest('ph-1');

    expect(result.clientsActive).toBe(4);
    expect(result.videosGenerated).toBe(42);
    expect(result.revenueEstUsd).toBe(1500);
    expect(result.commissionEarnedUsd).toBe(67);
    expect(result.ratingAvg).toBe(4.7);
    // Shape canon explícito 5 keys Sprint 9 (no expone clientsTotal del shared lib).
    expect(Object.keys(result).sort()).toEqual([
      'clientsActive',
      'commissionEarnedUsd',
      'ratingAvg',
      'revenueEstUsd',
      'videosGenerated',
    ]);
  });

  it('getPhotographerKpisDigest aggregation: ratingAvg null preservado', async () => {
    vi.mocked(getPhotographerKpis).mockResolvedValue({
      clientsActive: 0,
      clientsTotal: 0,
      videosGenerated: 0,
      revenueEstUsd: 0,
      commissionEarnedUsd: 0,
      ratingAvg: null,
    });

    const result = await getPhotographerKpisDigest('ph-empty');
    expect(result.clientsActive).toBe(0);
    expect(result.ratingAvg).toBeNull();
  });

  it('getPhotographerKpisRange aplica range filter', async () => {
    vi.mocked(aggregatePhotographerStats).mockResolvedValue({
      clientsActive: 2,
      clientsTotal: 3,
      videosGenerated: 12,
      revenueEstUsd: 600,
      commissionEarnedUsd: 13.4,
      ratingAvg: 4.5,
    });

    const result = await getPhotographerKpisRange('ph-1', {
      start: '2026-04-01',
      end: '2026-04-30',
    });

    expect(result.videosGenerated).toBe(12);
    expect(result.commissionEarnedUsd).toBe(13.4);
    expect(aggregatePhotographerStats).toHaveBeenCalledWith('ph-1', {
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });
});
