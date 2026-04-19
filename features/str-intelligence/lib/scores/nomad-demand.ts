// Nomad Demand Index — FASE 07b / BLOQUE 7b.I.
//
// Composite 0-100 que mide demanda de digital nomads por market mezclando:
//   Google Trends (50%)       — keywords {nomad, coworking, monthly rental, wifi apartment}+city.
//                               Score = avg search interest 0-100 (Google scale).
//   Review signals (30%)      — sum de topic mentions ['wifi', 'coworking', 'long_stay',
//                               'remote_work', 'workspace'] / reviews_analyzed.
//                               Mapping: 0% → 0; 30%+ → 100.
//   Length of stay median (20%) — desde str_market_monthly_aggregates.avg_length_of_stay.
//                               Mapping: 1d → 0; 7d → 50; 14d+ → 100.
//
// Pure calculator. Persistencia diferida a FASE 08 (zone_scores
// score_code='NOMAD').
//
// Confidence cascade:
//   high — los 3 inputs presentes con muestras decentes.
//   medium — 2 inputs.
//   low — 1 input.
//   insufficient_data — ninguno.

export const NOMAD_WEIGHTS = {
  trends: 0.5,
  reviews: 0.3,
  length_of_stay: 0.2,
} as const;

export const NOMAD_REVIEW_TOPICS = [
  'wifi',
  'coworking',
  'long_stay',
  'remote_work',
  'workspace',
] as const;

export type NomadConfidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface NomadInput {
  // Google Trends avg interest 0-100 (Google scale).
  readonly trends_avg_interest: number | null;
  readonly trends_keywords_count: number;
  // Topic mentions desde aggregate_zone_sentiment.topic_counts.
  readonly nomad_topic_mentions: number | null;
  readonly reviews_analyzed: number;
  // Length of stay median (días).
  readonly avg_length_of_stay: number | null;
  readonly length_of_stay_samples: number;
}

export interface NomadResult {
  readonly score: number;
  readonly confidence: NomadConfidence;
  readonly components: {
    readonly trends: number;
    readonly reviews: number;
    readonly length_of_stay: number;
  };
  readonly weights_applied: {
    readonly trends: number;
    readonly reviews: number;
    readonly length_of_stay: number;
  };
  readonly inputs_present: {
    readonly trends: boolean;
    readonly reviews: boolean;
    readonly length_of_stay: boolean;
  };
  readonly contributors_count: number;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function reviewsToComponent(mentions: number, totalReviews: number): number {
  if (totalReviews === 0) return 0;
  const share = mentions / totalReviews;
  // 0% → 0, 30%+ → 100, linear
  return clamp100((share / 0.3) * 100);
}

function losToComponent(losDays: number): number {
  // 1d → 0, 7d → 50, 14d+ → 100, piecewise linear.
  if (losDays <= 1) return 0;
  if (losDays >= 14) return 100;
  if (losDays <= 7) {
    return clamp100(((losDays - 1) / 6) * 50);
  }
  return clamp100(50 + ((losDays - 7) / 7) * 50);
}

export function computeNomadDemand(input: NomadInput): NomadResult {
  const trendsPresent = input.trends_avg_interest != null && input.trends_keywords_count > 0;
  const reviewsPresent = input.nomad_topic_mentions != null && input.reviews_analyzed > 0;
  const losPresent = input.avg_length_of_stay != null && input.length_of_stay_samples > 0;

  const trendsComponent = trendsPresent ? clamp100(input.trends_avg_interest ?? 0) : 0;
  const reviewsComponent = reviewsPresent
    ? reviewsToComponent(input.nomad_topic_mentions ?? 0, input.reviews_analyzed)
    : 0;
  const losComponent = losPresent ? losToComponent(input.avg_length_of_stay ?? 0) : 0;

  const totalWeight =
    (trendsPresent ? NOMAD_WEIGHTS.trends : 0) +
    (reviewsPresent ? NOMAD_WEIGHTS.reviews : 0) +
    (losPresent ? NOMAD_WEIGHTS.length_of_stay : 0);

  const presentMask = {
    trends: trendsPresent,
    reviews: reviewsPresent,
    length_of_stay: losPresent,
  };
  const contributorsCount =
    (trendsPresent ? 1 : 0) + (reviewsPresent ? 1 : 0) + (losPresent ? 1 : 0);

  if (totalWeight === 0) {
    return {
      score: 0,
      confidence: 'insufficient_data',
      components: { trends: 0, reviews: 0, length_of_stay: 0 },
      weights_applied: { trends: 0, reviews: 0, length_of_stay: 0 },
      inputs_present: presentMask,
      contributors_count: 0,
    };
  }

  const wTrends = trendsPresent ? NOMAD_WEIGHTS.trends / totalWeight : 0;
  const wReviews = reviewsPresent ? NOMAD_WEIGHTS.reviews / totalWeight : 0;
  const wLos = losPresent ? NOMAD_WEIGHTS.length_of_stay / totalWeight : 0;

  const score = trendsComponent * wTrends + reviewsComponent * wReviews + losComponent * wLos;

  const confidence: NomadConfidence = (() => {
    if (contributorsCount === 0) return 'insufficient_data';
    if (contributorsCount === 1) return 'low';
    if (contributorsCount === 2) return 'medium';
    return 'high';
  })();

  return {
    score: Math.round(score * 100) / 100,
    confidence,
    components: {
      trends: Math.round(trendsComponent * 100) / 100,
      reviews: Math.round(reviewsComponent * 100) / 100,
      length_of_stay: Math.round(losComponent * 100) / 100,
    },
    weights_applied: {
      trends: Math.round(wTrends * 10000) / 10000,
      reviews: Math.round(wReviews * 10000) / 10000,
      length_of_stay: Math.round(wLos * 10000) / 10000,
    },
    inputs_present: presentMask,
    contributors_count: contributorsCount,
  };
}

// Helper: suma mentions de topics nomad-related desde topic_counts agregados.
export function nomadMentionsFromTopicCounts(
  topicCounts: Readonly<Record<string, number>> | null,
): number | null {
  if (!topicCounts) return null;
  let total = 0;
  for (const topic of NOMAD_REVIEW_TOPICS) {
    total += topicCounts[topic] ?? 0;
  }
  return total;
}
