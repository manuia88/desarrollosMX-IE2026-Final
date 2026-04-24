import { describe, expect, it } from 'vitest';
import { HYPE_HALVING_THRESHOLD } from '@/features/ghost-zones/types';
import {
  computeGhostScorePure,
  deriveHypeLevel,
  heuristicPressMentions,
  heuristicSearchVolume,
} from '../ghost-engine';

const ZONE_A = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const ZONE_B = '11111111-2222-3333-4444-555555555555';
const PERIOD = '2026-05-01';

describe('heuristicSearchVolume', () => {
  it('determinístico (misma zone+period → mismo valor)', () => {
    expect(heuristicSearchVolume(ZONE_A, PERIOD)).toBe(heuristicSearchVolume(ZONE_A, PERIOD));
  });

  it('rango 0..10000 entero', () => {
    const v = heuristicSearchVolume(ZONE_A, PERIOD);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(10_000);
  });

  it('varía entre zonas', () => {
    const a = heuristicSearchVolume(ZONE_A, PERIOD);
    const b = heuristicSearchVolume(ZONE_B, PERIOD);
    expect(a).not.toBe(b);
  });

  it('varía entre períodos', () => {
    const p1 = heuristicSearchVolume(ZONE_A, '2026-05-01');
    const p2 = heuristicSearchVolume(ZONE_A, '2026-06-01');
    expect(p1).not.toBe(p2);
  });
});

describe('heuristicPressMentions', () => {
  it('determinístico', () => {
    expect(heuristicPressMentions(ZONE_A, PERIOD)).toBe(heuristicPressMentions(ZONE_A, PERIOD));
  });

  it('rango 0..500', () => {
    const v = heuristicPressMentions(ZONE_A, PERIOD);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(500);
  });
});

describe('computeGhostScorePure', () => {
  it('ghost_score en rango 0..100', () => {
    const r = computeGhostScorePure({
      searchVolume: 5000,
      pressMentions: 250,
      dmxAvg: 50,
    });
    expect(r.ghost_score).toBeGreaterThanOrEqual(0);
    expect(r.ghost_score).toBeLessThanOrEqual(100);
  });

  it('breakdown components en rango 0..100', () => {
    const r = computeGhostScorePure({ searchVolume: 10_000, pressMentions: 500, dmxAvg: 0 });
    expect(r.breakdown.search_component).toBe(100);
    expect(r.breakdown.press_component).toBe(100);
    expect(r.breakdown.dmx_gap_component).toBe(100);
  });

  it('breakdown weighted sum ≈ ghost_score', () => {
    const r = computeGhostScorePure({
      searchVolume: 3000,
      pressMentions: 150,
      dmxAvg: 70,
    });
    const expected =
      r.breakdown.search_component * 0.4 +
      r.breakdown.press_component * 0.3 +
      r.breakdown.dmx_gap_component * 0.3;
    expect(Math.abs(r.ghost_score - expected)).toBeLessThan(0.5);
  });

  it('dmx_avg null tratado como 50 (neutral)', () => {
    const rNull = computeGhostScorePure({
      searchVolume: 3000,
      pressMentions: 150,
      dmxAvg: null,
    });
    const rFifty = computeGhostScorePure({
      searchVolume: 3000,
      pressMentions: 150,
      dmxAvg: 50,
    });
    expect(rNull.ghost_score).toBe(rFifty.ghost_score);
    expect(rNull.dmx_avg).toBeNull();
    expect(rFifty.dmx_avg).toBe(50);
  });

  it('hype_halving_warning activa cuando buzz >> fundamentals', () => {
    const r = computeGhostScorePure({
      searchVolume: 10_000,
      pressMentions: 500,
      dmxAvg: 20,
    });
    const ratio = (r.breakdown.search_component + r.breakdown.press_component) / Math.max(20, 10);
    expect(ratio).toBeGreaterThanOrEqual(HYPE_HALVING_THRESHOLD);
    expect(r.hype_halving_warning).toBe(true);
  });

  it('hype_halving_warning NO activa cuando buzz ~ fundamentals', () => {
    const r = computeGhostScorePure({
      searchVolume: 3000,
      pressMentions: 100,
      dmxAvg: 70,
    });
    expect(r.hype_halving_warning).toBe(false);
  });

  it('sub_valued cuando ghost_score bajo', () => {
    const r = computeGhostScorePure({
      searchVolume: 500,
      pressMentions: 10,
      dmxAvg: 85,
    });
    expect(r.hype_level).toBe('sub_valued');
  });

  it('extreme_hype cuando hype_halving_warning', () => {
    const r = computeGhostScorePure({
      searchVolume: 10_000,
      pressMentions: 500,
      dmxAvg: 10,
    });
    expect(r.hype_level).toBe('extreme_hype');
  });
});

describe('deriveHypeLevel', () => {
  it('80+ → extreme_hype', () => {
    expect(deriveHypeLevel(85, false)).toBe('extreme_hype');
  });
  it('60..79 → over_hyped', () => {
    expect(deriveHypeLevel(65, false)).toBe('over_hyped');
  });
  it('35..59 → aligned', () => {
    expect(deriveHypeLevel(45, false)).toBe('aligned');
  });
  it('<35 → sub_valued', () => {
    expect(deriveHypeLevel(20, false)).toBe('sub_valued');
  });
  it('hype_halving_warning forzar extreme incluso con score bajo', () => {
    expect(deriveHypeLevel(30, true)).toBe('extreme_hype');
  });
});
