import { describe, expect, it } from 'vitest';
import {
  type AttributionTouchpoint,
  aggregateByChannel,
  computeAttributionWeights,
} from '../multi-touch';

const DAY = 86_400_000;

function tp(
  id: string,
  channel: string,
  occurredAt: string,
  utm: Partial<{
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
  }> = {},
): AttributionTouchpoint {
  return {
    id,
    channel,
    occurredAt,
    utmSource: utm.utmSource ?? null,
    utmMedium: utm.utmMedium ?? null,
    utmCampaign: utm.utmCampaign ?? null,
  };
}

describe('multi-touch attribution', () => {
  it('linear: weights split evenly across N touches', () => {
    const tps: readonly AttributionTouchpoint[] = [
      tp('a', 'meta_ads', '2026-04-01T00:00:00Z'),
      tp('b', 'google_ads', '2026-04-02T00:00:00Z'),
      tp('c', 'email', '2026-04-03T00:00:00Z'),
      tp('d', 'whatsapp', '2026-04-04T00:00:00Z'),
    ];
    const w = computeAttributionWeights(tps, 'linear');
    expect(w).toHaveLength(4);
    for (const r of w) expect(r.weight).toBeCloseTo(0.25, 6);
    const total = w.reduce((a, b) => a + b.weight, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('last_touch: full credit to most recent touch', () => {
    const tps: readonly AttributionTouchpoint[] = [
      tp('a', 'meta_ads', '2026-04-01T00:00:00Z'),
      tp('b', 'google_ads', '2026-04-02T00:00:00Z'),
      tp('c', 'whatsapp', '2026-04-10T00:00:00Z'),
    ];
    const w = computeAttributionWeights(tps, 'last_touch');
    const last = w.find((r) => r.id === 'c');
    expect(last?.weight).toBe(1);
    const others = w.filter((r) => r.id !== 'c');
    for (const r of others) expect(r.weight).toBe(0);
  });

  it('position_based: 40/40 with 20 split across middle', () => {
    const tps: readonly AttributionTouchpoint[] = [
      tp('a', 'meta_ads', '2026-04-01T00:00:00Z'),
      tp('b', 'google_ads', '2026-04-02T00:00:00Z'),
      tp('c', 'email', '2026-04-03T00:00:00Z'),
      tp('d', 'whatsapp', '2026-04-04T00:00:00Z'),
    ];
    const w = computeAttributionWeights(tps, 'position_based');
    const first = w[0];
    const last = w[w.length - 1];
    expect(first?.weight).toBeCloseTo(0.4, 6);
    expect(last?.weight).toBeCloseTo(0.4, 6);
    const middle = w.slice(1, -1);
    expect(middle).toHaveLength(2);
    for (const m of middle) expect(m.weight).toBeCloseTo(0.1, 6);
  });

  it('position_based: with single touch returns weight 1', () => {
    const tps: readonly AttributionTouchpoint[] = [tp('a', 'meta_ads', '2026-04-01T00:00:00Z')];
    const w = computeAttributionWeights(tps, 'position_based');
    expect(w).toHaveLength(1);
    expect(w[0]?.weight).toBe(1);
  });

  it('position_based: with two touches splits 50/50', () => {
    const tps: readonly AttributionTouchpoint[] = [
      tp('a', 'meta_ads', '2026-04-01T00:00:00Z'),
      tp('b', 'whatsapp', '2026-04-02T00:00:00Z'),
    ];
    const w = computeAttributionWeights(tps, 'position_based');
    expect(w[0]?.weight).toBe(0.5);
    expect(w[1]?.weight).toBe(0.5);
  });

  it('time_decay: last touch has highest weight; weights sum to 1', () => {
    const base = new Date('2026-04-15T00:00:00Z').getTime();
    const tps: readonly AttributionTouchpoint[] = [
      tp('a', 'meta_ads', new Date(base - 14 * DAY).toISOString()),
      tp('b', 'google_ads', new Date(base - 7 * DAY).toISOString()),
      tp('c', 'whatsapp', new Date(base).toISOString()),
    ];
    const w = computeAttributionWeights(tps, 'time_decay');
    const total = w.reduce((a, b) => a + b.weight, 0);
    expect(total).toBeCloseTo(1, 6);
    const last = w.find((r) => r.id === 'c');
    const oldest = w.find((r) => r.id === 'a');
    expect(last?.weight ?? 0).toBeGreaterThan(oldest?.weight ?? 0);
  });

  it('returns empty array for no touchpoints', () => {
    expect(computeAttributionWeights([], 'linear')).toEqual([]);
    expect(computeAttributionWeights([], 'last_touch')).toEqual([]);
  });

  it('aggregateByChannel sums weights and touches per channel', () => {
    const tps: readonly AttributionTouchpoint[] = [
      tp('a', 'meta_ads', '2026-04-01T00:00:00Z'),
      tp('b', 'meta_ads', '2026-04-02T00:00:00Z'),
      tp('c', 'whatsapp', '2026-04-03T00:00:00Z'),
    ];
    const w = computeAttributionWeights(tps, 'linear');
    const breakdown = aggregateByChannel(w);
    expect(breakdown).toHaveLength(2);
    const meta = breakdown.find((b) => b.channel === 'meta_ads');
    expect(meta?.touches).toBe(2);
    expect(meta?.weight ?? 0).toBeCloseTo(2 / 3, 6);
  });
});
