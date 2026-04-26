import { describe, expect, it } from 'vitest';

describe('canon-asesor barrel — module exports', () => {
  it('re-exports all components and hooks', async () => {
    const mod = await import('../index');
    expect(typeof mod.DecisionCrystal).toBe('object');
    expect(typeof mod.ConfidenceHalo).toBe('object');
    expect(typeof mod.TideLineChart).toBe('object');
    expect(typeof mod.ConversationThermometer).toBe('object');
    expect(typeof mod.MoodStripe).toBe('object');
    expect(typeof mod.DiffCard).toBe('object');
    expect(typeof mod.HeatmapDensity).toBe('object');
    expect(typeof mod.CalendarConstellation).toBe('object');
    expect(typeof mod.useListenMode).toBe('function');
    expect(typeof mod.useSpatialSearch).toBe('function');
  });
});
