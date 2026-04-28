import { describe, expect, it } from 'vitest';
import {
  aggregatePhotographerStats,
  getPhotographerKpis,
  type PhotographerKpis,
  type PhotographerStatsRange,
} from '../index';

describe('photographer-metrics-cross-feature', () => {
  it('exports getPhotographerKpis function', () => {
    expect(typeof getPhotographerKpis).toBe('function');
  });

  it('exports aggregatePhotographerStats function', () => {
    expect(typeof aggregatePhotographerStats).toBe('function');
  });

  it('PhotographerKpis interface fields are typed', () => {
    const sample: PhotographerKpis = {
      clientsActive: 0,
      clientsTotal: 0,
      videosGenerated: 0,
      revenueEstUsd: 0,
      commissionEarnedUsd: 0,
      ratingAvg: null,
    };
    expect(sample.clientsActive).toBe(0);
    expect(sample.ratingAvg).toBeNull();
  });

  it('PhotographerStatsRange has start + end strings', () => {
    const range: PhotographerStatsRange = { start: '2026-01-01', end: '2026-12-31' };
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2026-12-31');
  });
});
