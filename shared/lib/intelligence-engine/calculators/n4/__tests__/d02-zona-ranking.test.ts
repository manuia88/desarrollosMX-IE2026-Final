import { describe, expect, it } from 'vitest';
import {
  COMPOSITE_WEIGHTS,
  computeD02ZonaRanking,
  getLabelKey,
  IPV_WEIGHTS,
  LIV_WEIGHTS,
  methodology,
  version,
} from '../d02-zona-ranking';

describe('D02 Zona Ranking', () => {
  it('declara methodology + weights IPV/LIV/composite correctos', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    const ipvSum = Object.values(IPV_WEIGHTS).reduce((s, v) => s + v, 0);
    const livSum = Object.values(LIV_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(ipvSum).toBeCloseTo(1, 5);
    expect(livSum).toBeCloseTo(1, 5);
    expect(COMPOSITE_WEIGHTS.ipv + COMPOSITE_WEIGHTS.liv).toBeCloseTo(1, 5);
    expect(methodology.composite_weights.ipv).toBe(0.6);
  });

  it('top decil: todas dims 90+ con percentile 95 → top_decil + high confidence', () => {
    const scores: Record<string, number> = {
      F08: 92,
      F09: 90,
      N11: 88,
      A12: 91,
      N01: 85,
      N08: 93,
      N10: 80,
      N07: 90,
      H01: 95,
      H02: 88,
      N02: 90,
      N04: 85,
    };
    const res = computeD02ZonaRanking({
      scores,
      context: {
        rank: 3,
        total_zones: 100,
        percentile_country: 97,
        peer_zones: ['z1', 'z2'],
      },
    });
    expect(res.confidence).toBe('high');
    expect(res.value).toBeGreaterThanOrEqual(85);
    expect(res.components.rank).toBe(3);
    expect(res.components.total_zones).toBe(100);
    expect(res.components.ipv_component).toBeGreaterThanOrEqual(85);
    expect(res.components.liv_component).toBeGreaterThanOrEqual(85);
    expect(res.components.coverage_pct).toBe(100);
    const label = getLabelKey(res.value, res.confidence, res.components.percentile_country);
    expect(label).toBe('ie.score.d02.top_decil');
  });

  it('medio: dims ~50 → value medio', () => {
    const scores: Record<string, number> = {
      F08: 50,
      F09: 55,
      N11: 45,
      A12: 50,
      N01: 50,
      N08: 55,
      N10: 50,
      N07: 50,
      H01: 45,
      H02: 55,
      N02: 50,
      N04: 50,
    };
    const res = computeD02ZonaRanking({
      scores,
      context: { rank: 50, total_zones: 100, percentile_country: 50 },
    });
    expect(res.confidence).toBe('high');
    expect(res.value).toBeGreaterThanOrEqual(45);
    expect(res.value).toBeLessThanOrEqual(55);
    const label = getLabelKey(res.value, res.confidence, 50);
    expect(label).toBe('ie.score.d02.medio');
  });

  it('bottom: dims bajas → value bajo + label bajo', () => {
    const scores: Record<string, number> = {
      F08: 20,
      F09: 25,
      N11: 15,
      A12: 20,
      N01: 25,
      N08: 20,
      N10: 15,
      N07: 20,
      H01: 25,
      H02: 20,
      N02: 25,
      N04: 20,
    };
    const res = computeD02ZonaRanking({
      scores,
      context: { rank: 95, total_zones: 100, percentile_country: 5 },
    });
    expect(res.value).toBeLessThanOrEqual(30);
    const label = getLabelKey(res.value, res.confidence, 5);
    expect(label).toBe('ie.score.d02.bajo');
  });

  it('insufficient cuando >50% missing en ambos subíndices', () => {
    const res = computeD02ZonaRanking({
      scores: {
        F08: 80,
        F09: null as unknown as number,
      },
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.value).toBe(0);
    expect(res.components.ipv_component).toBe(0);
    expect(res.components.liv_component).toBe(0);
    const label = getLabelKey(0, res.confidence);
    expect(label).toBe('ie.score.d02.insufficient');
  });

  it('missing 1 dim en IPV renormaliza weights IPV sin tumbar score', () => {
    const scores: Record<string, number | null> = {
      F08: 80,
      F09: null, // missing IPV
      N11: 75,
      A12: 70,
      N01: 80,
      N08: 75,
      N10: 70,
      N07: 75,
      H01: 80,
      H02: 75,
      N02: 80,
      N04: 75,
    };
    const res = computeD02ZonaRanking({ scores });
    expect(res.confidence).not.toBe('insufficient_data');
    expect(res.components.missing_dimensions).not.toContain('F08');
    // F09 solo en IPV. Si falta en IPV y LIV no lo tiene como requerido → missing_in_both
    // LIV no contiene F09 → se considera missing_in_both.
    expect(res.components.ipv_weights_applied.F09).toBeUndefined();
    // IPV renormaliza: F08=0.3/0.75, N11=0.2/0.75, A12=0.15/0.75, N01=0.1/0.75
    const w = res.components.ipv_weights_applied;
    const wsum = Object.values(w).reduce((s, v) => s + v, 0);
    expect(wsum).toBeCloseTo(1, 3);
  });

  it('top_cuartil label cuando percentile ∈ [75, 90)', () => {
    const label = getLabelKey(70, 'high', 80);
    expect(label).toBe('ie.score.d02.top_cuartil');
  });

  it('fallback a value absoluto cuando no hay percentile', () => {
    const labelTop = getLabelKey(85, 'high', null);
    expect(labelTop).toBe('ie.score.d02.top_decil');
    const labelMid = getLabelKey(50, 'high', null);
    expect(labelMid).toBe('ie.score.d02.medio');
    const labelLow = getLabelKey(20, 'high', null);
    expect(labelLow).toBe('ie.score.d02.bajo');
  });

  it('peer_zones se propaga a components desde context', () => {
    const peers = ['zone-a', 'zone-b', 'zone-c'];
    const scores: Record<string, number> = {
      F08: 70,
      F09: 70,
      N11: 70,
      A12: 70,
      N01: 70,
      N08: 70,
      N10: 70,
      N07: 70,
      H01: 70,
      H02: 70,
      N02: 70,
      N04: 70,
    };
    const res = computeD02ZonaRanking({
      scores,
      context: { peer_zones: peers, rank: 25, total_zones: 100, percentile_country: 75 },
    });
    expect(res.components.peer_zones).toEqual(peers);
  });
});
