export type AttributionModel = 'linear' | 'time_decay' | 'position_based' | 'last_touch';

export interface AttributionTouchpoint {
  readonly id: string;
  readonly channel: string;
  readonly occurredAt: Date | string;
  readonly utmSource: string | null;
  readonly utmMedium: string | null;
  readonly utmCampaign: string | null;
}

export interface AttributionWeight {
  readonly id: string;
  readonly channel: string;
  readonly weight: number;
  readonly utmSource: string | null;
  readonly utmMedium: string | null;
  readonly utmCampaign: string | null;
}

export interface ChannelBreakdown {
  readonly channel: string;
  readonly weight: number;
  readonly touches: number;
}

const TIME_DECAY_HALFLIFE_DAYS = 7;
const POSITION_FIRST_LAST_SHARE = 0.4;
const POSITION_MIDDLE_SHARE = 0.2;

export function computeAttributionWeights(
  touchpoints: readonly AttributionTouchpoint[],
  model: AttributionModel,
): readonly AttributionWeight[] {
  if (touchpoints.length === 0) return [];

  const sorted = [...touchpoints].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const n = sorted.length;

  if (model === 'last_touch') {
    return sorted.map((t, i) => toWeight(t, i === n - 1 ? 1 : 0));
  }

  if (model === 'linear') {
    const w = 1 / n;
    return sorted.map((t) => toWeight(t, w));
  }

  if (model === 'position_based') {
    const first = sorted[0];
    if (!first) return [];
    if (n === 1) return [toWeight(first, 1)];
    const second = sorted[1];
    if (n === 2 && second) {
      return [toWeight(first, 0.5), toWeight(second, 0.5)];
    }
    const middleShare = POSITION_MIDDLE_SHARE / (n - 2);
    return sorted.map((t, i) => {
      if (i === 0 || i === n - 1) return toWeight(t, POSITION_FIRST_LAST_SHARE);
      return toWeight(t, middleShare);
    });
  }

  const lastTouch = sorted[n - 1];
  if (!lastTouch) return [];
  const lastTime = new Date(lastTouch.occurredAt).getTime();
  const raw = sorted.map((t) => {
    const deltaDays = Math.max(0, (lastTime - new Date(t.occurredAt).getTime()) / 86_400_000);
    return 2 ** (-deltaDays / TIME_DECAY_HALFLIFE_DAYS);
  });
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return sorted.map((t, i) => toWeight(t, (raw[i] ?? 0) / total));
}

function toWeight(t: AttributionTouchpoint, w: number): AttributionWeight {
  return {
    id: t.id,
    channel: t.channel,
    weight: w,
    utmSource: t.utmSource,
    utmMedium: t.utmMedium,
    utmCampaign: t.utmCampaign,
  };
}

export function aggregateByChannel(
  weights: readonly AttributionWeight[],
): readonly ChannelBreakdown[] {
  const map = new Map<string, ChannelBreakdown>();
  for (const w of weights) {
    const prev = map.get(w.channel) ?? { channel: w.channel, weight: 0, touches: 0 };
    map.set(w.channel, {
      channel: w.channel,
      weight: prev.weight + w.weight,
      touches: prev.touches + 1,
    });
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight);
}
