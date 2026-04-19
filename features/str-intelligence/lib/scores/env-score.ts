// Zone Environmental Score (ENV) — FASE 07b / BLOQUE 7b.F.
//
// Composite 0-100 por market_id que mezcla:
//   AQI (50%)   — inverted normalize: AQI alto → score bajo.
//                 Mapping: 0 → 100 ; 50 → 80 ; 100 → 60 ; 150 → 40 ; 200 → 20 ; >300 → 0.
//   Noise (50%) — inverted normalize: noise_share alto → score bajo.
//                 noise_share = reviews mencionando noise / reviews totales (de aggregate_zone_sentiment).
//                 Mapping: 0% → 100 ; 5% → 80 ; 10% → 60 ; 20% → 40 ; 40%+ → 0.
//
// Pure: NO tabla persistente — score servido on-demand vía tRPC env.get(market_id).
// Persistencia diferida a FASE 08 (zone_scores score_code='ENV').
//
// Confidence cascade:
//   high — aqi_samples ≥ 14 días + reviews_analyzed ≥ 100.
//   medium — aqi_samples ≥ 7 OR reviews_analyzed ≥ 50.
//   low — aqi_samples ≥ 1 OR reviews_analyzed ≥ 10.
//   insufficient_data — ningún input.

export const ENV_WEIGHTS = {
  aqi: 0.5,
  noise: 0.5,
} as const;

export type EnvConfidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface EnvInput {
  // AQI promedio últimos 30 días (US EPA scale 0-500).
  readonly aqi_avg_30d: number | null;
  readonly aqi_samples_30d: number;
  // Noise share = noise-topic mentions / total analyzed reviews (0..1).
  readonly noise_share: number | null;
  readonly reviews_analyzed: number;
}

export interface EnvResult {
  readonly score: number; // 0-100
  readonly confidence: EnvConfidence;
  readonly components: {
    readonly aqi: number;
    readonly noise: number;
  };
  readonly weights_applied: {
    readonly aqi: number;
    readonly noise: number;
  };
  readonly inputs_present: {
    readonly aqi: boolean;
    readonly noise: boolean;
  };
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

// Piecewise linear AQI → score mapping (US EPA breakpoints inverted).
function aqiToComponent(aqi: number): number {
  if (aqi <= 0) return 100;
  if (aqi >= 300) return 0;
  // Anchors: (0,100) (50,80) (100,60) (150,40) (200,20) (300,0).
  const anchors: Array<[number, number]> = [
    [0, 100],
    [50, 80],
    [100, 60],
    [150, 40],
    [200, 20],
    [300, 0],
  ];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (!a || !b) continue;
    const [x0, y0] = a;
    const [x1, y1] = b;
    if (aqi >= x0 && aqi <= x1) {
      const t = (aqi - x0) / (x1 - x0);
      return clamp100(y0 + t * (y1 - y0));
    }
  }
  return 0;
}

function noiseToComponent(noiseShare: number): number {
  if (noiseShare <= 0) return 100;
  if (noiseShare >= 0.4) return 0;
  // Anchors: (0,100) (0.05,80) (0.10,60) (0.20,40) (0.40,0).
  const anchors: Array<[number, number]> = [
    [0, 100],
    [0.05, 80],
    [0.1, 60],
    [0.2, 40],
    [0.4, 0],
  ];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (!a || !b) continue;
    const [x0, y0] = a;
    const [x1, y1] = b;
    if (noiseShare >= x0 && noiseShare <= x1) {
      const t = (noiseShare - x0) / (x1 - x0);
      return clamp100(y0 + t * (y1 - y0));
    }
  }
  return 0;
}

function deriveConfidence(input: EnvInput): EnvConfidence {
  const aqiOk = input.aqi_avg_30d != null && input.aqi_samples_30d > 0;
  const noiseOk = input.noise_share != null && input.reviews_analyzed > 0;
  if (!aqiOk && !noiseOk) return 'insufficient_data';

  const aqiHigh = input.aqi_samples_30d >= 14;
  const noiseHigh = input.reviews_analyzed >= 100;
  const aqiMid = input.aqi_samples_30d >= 7;
  const noiseMid = input.reviews_analyzed >= 50;

  if (aqiHigh && noiseHigh) return 'high';
  if (aqiOk && noiseOk && (aqiMid || noiseMid)) return 'medium';
  if (aqiOk || noiseOk) return 'low';
  return 'insufficient_data';
}

export function computeEnvScore(input: EnvInput): EnvResult {
  const aqiPresent = input.aqi_avg_30d != null && input.aqi_samples_30d > 0;
  const noisePresent = input.noise_share != null && input.reviews_analyzed > 0;

  const aqiComponent = aqiPresent ? aqiToComponent(input.aqi_avg_30d ?? 0) : 0;
  const noiseComponent = noisePresent ? noiseToComponent(input.noise_share ?? 0) : 0;

  const totalWeight = (aqiPresent ? ENV_WEIGHTS.aqi : 0) + (noisePresent ? ENV_WEIGHTS.noise : 0);

  if (totalWeight === 0) {
    return {
      score: 0,
      confidence: 'insufficient_data',
      components: { aqi: 0, noise: 0 },
      weights_applied: { aqi: 0, noise: 0 },
      inputs_present: { aqi: false, noise: false },
    };
  }

  const wAqi = aqiPresent ? ENV_WEIGHTS.aqi / totalWeight : 0;
  const wNoise = noisePresent ? ENV_WEIGHTS.noise / totalWeight : 0;

  const score = aqiComponent * wAqi + noiseComponent * wNoise;

  return {
    score: Math.round(score * 100) / 100,
    confidence: deriveConfidence(input),
    components: {
      aqi: Math.round(aqiComponent * 100) / 100,
      noise: Math.round(noiseComponent * 100) / 100,
    },
    weights_applied: {
      aqi: Math.round(wAqi * 10000) / 10000,
      noise: Math.round(wNoise * 10000) / 10000,
    },
    inputs_present: {
      aqi: aqiPresent,
      noise: noisePresent,
    },
  };
}

// Helper: deriva noise_share desde topic_counts agregados (output de
// aggregate_zone_sentiment SQL fn). Si el caller ya tiene topic_counts +
// reviews_analyzed, computa noise_share localmente.
export function noiseShareFromTopicCounts(
  topicCounts: Readonly<Record<string, number>> | null,
  reviewsAnalyzed: number,
): number | null {
  if (!topicCounts || reviewsAnalyzed === 0) return null;
  const noiseMentions = topicCounts['noise'] ?? 0;
  return noiseMentions / reviewsAnalyzed;
}
