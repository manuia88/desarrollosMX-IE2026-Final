// F14.F.7 Sprint 6 — Tests M09 Sprint 6 metrics aggregator (PURE, no supabase).

import { describe, expect, it } from 'vitest';
import {
  aggregateSprint6Metrics,
  Sprint6MetricsRowSchema,
} from '@/features/dmx-studio/lib/cross-functions/m09-sprint6-metrics';

const NOW = Date.parse('2026-04-27T12:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(NOW - days * MS_PER_DAY).toISOString();
}

describe('aggregateSprint6Metrics', () => {
  it('returns zeros when all input arrays are empty', () => {
    const result = aggregateSprint6Metrics({
      stagings: [],
      drones: [],
      clips: [],
      cinemaProjects: 0,
      nowMs: NOW,
    });
    expect(result.virtual_stagings_total).toBe(0);
    expect(result.virtual_stagings_last_30d).toBe(0);
    expect(result.drone_simulations_total).toBe(0);
    expect(result.drone_simulations_by_pattern).toEqual({});
    expect(result.seedance_clips_total).toBe(0);
    expect(result.cinema_mode_projects).toBe(0);
    expect(() => Sprint6MetricsRowSchema.parse(result)).not.toThrow();
  });

  it('counts only stagings within last 30 days for the windowed metric', () => {
    const result = aggregateSprint6Metrics({
      stagings: [
        { created_at: isoDaysAgo(1) },
        { created_at: isoDaysAgo(15) },
        { created_at: isoDaysAgo(29) },
        { created_at: isoDaysAgo(31) },
        { created_at: isoDaysAgo(90) },
      ],
      drones: [],
      clips: [],
      cinemaProjects: 0,
      nowMs: NOW,
    });
    expect(result.virtual_stagings_total).toBe(5);
    expect(result.virtual_stagings_last_30d).toBe(3);
  });

  it('buckets drone simulations by simulation_type', () => {
    const result = aggregateSprint6Metrics({
      stagings: [],
      drones: [
        { simulation_type: 'reveal' },
        { simulation_type: 'reveal' },
        { simulation_type: 'orbit' },
        { simulation_type: 'flythrough' },
        { simulation_type: 'flythrough' },
        { simulation_type: 'flythrough' },
      ],
      clips: [],
      cinemaProjects: 0,
      nowMs: NOW,
    });
    expect(result.drone_simulations_total).toBe(6);
    expect(result.drone_simulations_by_pattern).toEqual({
      reveal: 2,
      orbit: 1,
      flythrough: 3,
    });
  });

  it('handles unknown simulation types + clips length + cinema fallback', () => {
    const result = aggregateSprint6Metrics({
      stagings: [{ created_at: isoDaysAgo(2) }],
      drones: [{ simulation_type: '' }, { simulation_type: 'reveal' }],
      clips: [{}, {}, {}, {}],
      cinemaProjects: 7.9,
      nowMs: NOW,
    });
    expect(result.seedance_clips_total).toBe(4);
    expect(result.drone_simulations_by_pattern.unknown).toBe(1);
    expect(result.drone_simulations_by_pattern.reveal).toBe(1);
    expect(result.cinema_mode_projects).toBe(7);
    expect(result.virtual_stagings_last_30d).toBe(1);
  });
});
