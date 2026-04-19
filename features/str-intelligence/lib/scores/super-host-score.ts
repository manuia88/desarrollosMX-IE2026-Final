// Super-Host score (FASE 07b / BLOQUE 7b.G).
//
// Composite 0-100 + tier assignment + churn_risk inference.
// Pesos alineados con plan §7b.G.1.1:
//   occupancy_rate_avg 40%
//   avg_rating 25% (0-5 → 0-100)
//   reviews_count_normalized 15% (log-scaled)
//   portfolio_size 10% (min(listings / 20, 1) × 100)
//   retention_12m 10% (0-1 → 0-100)

export const SUPER_HOST_WEIGHTS = {
  occupancy: 0.4,
  rating: 0.25,
  reviews_count: 0.15,
  portfolio: 0.1,
  retention: 0.1,
} as const;

export type HostTier = 'diamond' | 'gold' | 'silver' | 'bronze';

export interface SuperHostInput {
  readonly avg_occupancy_rate: number | null; // 0..1
  readonly avg_rating: number | null; // 0..5
  readonly avg_reviews_count: number | null; // raw count.
  readonly listings_count: number; // portfolio size.
  readonly retention_12m_rate: number | null; // 0..1
  readonly listings_count_prev_30d?: number | undefined;
  readonly avg_price_delta_pct_30d?: number | undefined;
  readonly transitioned_to_inactive_ratio?: number | undefined;
}

export interface SuperHostResult {
  readonly score: number;
  readonly tier: HostTier;
  readonly churn_risk: number;
  readonly components: {
    readonly occupancy: number;
    readonly rating: number;
    readonly reviews_count: number;
    readonly portfolio: number;
    readonly retention: number;
  };
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function tierOf(score: number): HostTier {
  if (score >= 85) return 'diamond';
  if (score >= 70) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}

function inferChurnRisk(input: SuperHostInput): number {
  // Combina señales del plan §7b.G.1.3:
  //   listing_count drop 20% en 30d → +0.4
  //   avg_price drop 15% → +0.3
  //   status → inactive transitions (ratio) → +0.3 × ratio
  let risk = 0;
  if (
    input.listings_count_prev_30d != null &&
    input.listings_count_prev_30d > 0 &&
    input.listings_count_prev_30d > input.listings_count
  ) {
    const dropPct =
      (input.listings_count_prev_30d - input.listings_count) / input.listings_count_prev_30d;
    if (dropPct >= 0.2) risk += Math.min(dropPct, 0.5) * 0.8;
  }
  if (input.avg_price_delta_pct_30d != null && input.avg_price_delta_pct_30d <= -0.15) {
    risk += Math.min(Math.abs(input.avg_price_delta_pct_30d), 0.3) * 1.0;
  }
  if (input.transitioned_to_inactive_ratio != null) {
    risk += input.transitioned_to_inactive_ratio * 0.3;
  }
  return clamp01(risk);
}

export function computeSuperHostScore(input: SuperHostInput): SuperHostResult {
  const occupancyComponent = clamp100((input.avg_occupancy_rate ?? 0) * 100);
  const ratingComponent = clamp100(((input.avg_rating ?? 0) / 5) * 100);

  const reviewsRaw = input.avg_reviews_count ?? 0;
  const reviewsComponent = clamp100((Math.log10(1 + reviewsRaw) / Math.log10(1 + 200)) * 100);

  const portfolioComponent = clamp100(Math.min(input.listings_count / 20, 1) * 100);
  const retentionComponent = clamp100((input.retention_12m_rate ?? 0) * 100);

  const score =
    occupancyComponent * SUPER_HOST_WEIGHTS.occupancy +
    ratingComponent * SUPER_HOST_WEIGHTS.rating +
    reviewsComponent * SUPER_HOST_WEIGHTS.reviews_count +
    portfolioComponent * SUPER_HOST_WEIGHTS.portfolio +
    retentionComponent * SUPER_HOST_WEIGHTS.retention;

  return {
    score: Math.round(score * 100) / 100,
    tier: tierOf(score),
    churn_risk: Math.round(inferChurnRisk(input) * 1000) / 1000,
    components: {
      occupancy: Math.round(occupancyComponent * 100) / 100,
      rating: Math.round(ratingComponent * 100) / 100,
      reviews_count: Math.round(reviewsComponent * 100) / 100,
      portfolio: Math.round(portfolioComponent * 100) / 100,
      retention: Math.round(retentionComponent * 100) / 100,
    },
  };
}
