// Zone Investment Score (ZIS) — FASE 07b / BLOQUE 7b.D / MÓDULO 7b.D.2.
//
// Composite 0-100 por market_id que mezcla:
//   STR Baseline       (30%) — desde computeStrBaseline (7b.A).
//   STR Cap Rate       (25%) — desde computeStrViability (7b.B), normalizado [0..0.20] → [0..100].
//   LTR-STR Regime     (15%) — desde computeLtrStrOpportunity (7b.C).
//   Sentiment agregado (15%) — sentiment_weighted_avg [-1..1] → [0..100].
//   Momentum 12m       (15%) — price_per_m2 yoy% normalizado en [-0.10..+0.30] → [0..100].
//
// Pure calculator: NO toca BD ni red. Persistencia diferida a FASE 08
// (zone_scores) — el tRPC zoneInvestment.get materializa on-demand y
// caches en memoria por request.

export const ZIS_WEIGHTS = {
  baseline: 0.3,
  cap_rate: 0.25,
  ltr_regime: 0.15,
  sentiment: 0.15,
  momentum: 0.15,
} as const;

export type ZisConfidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface ZisInput {
  readonly baseline_score: number | null; // 0-100
  readonly baseline_confidence: ZisConfidence;
  readonly cap_rate: number | null; // 0..1 (e.g. 0.08 = 8%)
  readonly ltr_opportunity_score: number | null; // 0-100
  readonly ltr_confidence: ZisConfidence;
  readonly sentiment_weighted_avg: number | null; // -1..1
  readonly reviews_analyzed: number;
  readonly momentum_yoy_pct: number | null; // -1..+inf (e.g. 0.12 = +12%)
}

export interface ZisResult {
  readonly score: number; // 0-100
  readonly confidence: ZisConfidence;
  readonly components: {
    readonly baseline: number;
    readonly cap_rate: number;
    readonly ltr_regime: number;
    readonly sentiment: number;
    readonly momentum: number;
  };
  readonly weights_applied: {
    readonly baseline: number;
    readonly cap_rate: number;
    readonly ltr_regime: number;
    readonly sentiment: number;
    readonly momentum: number;
  };
  readonly inputs_present: {
    readonly baseline: boolean;
    readonly cap_rate: boolean;
    readonly ltr_regime: boolean;
    readonly sentiment: boolean;
    readonly momentum: boolean;
  };
  readonly contributors_count: number;
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

function normalizeCapRate(capRate: number): number {
  // Linear mapping: cap_rate=0 → 0; cap_rate=0.20 → 100. Saturado fuera.
  return clamp100((capRate / 0.2) * 100);
}

function normalizeSentiment(sentiment: number): number {
  // Map [-1, 1] → [0, 100].
  const scaled = (sentiment + 1) / 2;
  return clamp100(clamp01(scaled) * 100);
}

function normalizeMomentum(yoyPct: number): number {
  // Map [-0.10, +0.30] → [0, 100]. Below -10% → 0. Above +30% → 100.
  const lo = -0.1;
  const hi = 0.3;
  const scaled = (yoyPct - lo) / (hi - lo);
  return clamp100(clamp01(scaled) * 100);
}

function downgradeConfidence(a: ZisConfidence, b: ZisConfidence): ZisConfidence {
  const order: Record<ZisConfidence, number> = {
    insufficient_data: 0,
    low: 1,
    medium: 2,
    high: 3,
  };
  return order[a] <= order[b] ? a : b;
}

export function computeZoneInvestmentScore(input: ZisInput): ZisResult {
  // Para cada componente: si null → no aplica, redistribuir su peso entre
  // los presentes proporcionalmente. Esto evita penalizar markets con datos
  // parciales (e.g. nuevo market sin sentiment todavía) más allá del
  // downgrade explícito de confidence.

  const baselinePresent = input.baseline_score != null;
  const capRatePresent = input.cap_rate != null;
  const ltrPresent = input.ltr_opportunity_score != null;
  const sentimentPresent = input.sentiment_weighted_avg != null && input.reviews_analyzed > 0;
  const momentumPresent = input.momentum_yoy_pct != null;

  const baselineComponent = baselinePresent ? clamp100(input.baseline_score ?? 0) : 0;
  const capRateComponent = capRatePresent ? normalizeCapRate(input.cap_rate ?? 0) : 0;
  const ltrComponent = ltrPresent ? clamp100(input.ltr_opportunity_score ?? 0) : 0;
  const sentimentComponent = sentimentPresent
    ? normalizeSentiment(input.sentiment_weighted_avg ?? 0)
    : 0;
  const momentumComponent = momentumPresent ? normalizeMomentum(input.momentum_yoy_pct ?? 0) : 0;

  const presentMask = {
    baseline: baselinePresent,
    cap_rate: capRatePresent,
    ltr_regime: ltrPresent,
    sentiment: sentimentPresent,
    momentum: momentumPresent,
  };

  const totalPresentWeight =
    (baselinePresent ? ZIS_WEIGHTS.baseline : 0) +
    (capRatePresent ? ZIS_WEIGHTS.cap_rate : 0) +
    (ltrPresent ? ZIS_WEIGHTS.ltr_regime : 0) +
    (sentimentPresent ? ZIS_WEIGHTS.sentiment : 0) +
    (momentumPresent ? ZIS_WEIGHTS.momentum : 0);

  const contributorsCount =
    (baselinePresent ? 1 : 0) +
    (capRatePresent ? 1 : 0) +
    (ltrPresent ? 1 : 0) +
    (sentimentPresent ? 1 : 0) +
    (momentumPresent ? 1 : 0);

  if (totalPresentWeight === 0 || contributorsCount === 0) {
    return {
      score: 0,
      confidence: 'insufficient_data',
      components: {
        baseline: 0,
        cap_rate: 0,
        ltr_regime: 0,
        sentiment: 0,
        momentum: 0,
      },
      weights_applied: {
        baseline: 0,
        cap_rate: 0,
        ltr_regime: 0,
        sentiment: 0,
        momentum: 0,
      },
      inputs_present: presentMask,
      contributors_count: 0,
    };
  }

  // Renormalize weights only across present components.
  const wBaseline = baselinePresent ? ZIS_WEIGHTS.baseline / totalPresentWeight : 0;
  const wCapRate = capRatePresent ? ZIS_WEIGHTS.cap_rate / totalPresentWeight : 0;
  const wLtr = ltrPresent ? ZIS_WEIGHTS.ltr_regime / totalPresentWeight : 0;
  const wSentiment = sentimentPresent ? ZIS_WEIGHTS.sentiment / totalPresentWeight : 0;
  const wMomentum = momentumPresent ? ZIS_WEIGHTS.momentum / totalPresentWeight : 0;

  const score =
    baselineComponent * wBaseline +
    capRateComponent * wCapRate +
    ltrComponent * wLtr +
    sentimentComponent * wSentiment +
    momentumComponent * wMomentum;

  // Confidence: cascade del peor entre baseline/ltr (los upstream con
  // confidence formal). Sentiment downgrade si reviews_analyzed < 30.
  // Momentum sin penalty (single-source; presence/absence es señal binaria).
  let confidence: ZisConfidence = 'high';
  if (baselinePresent) confidence = downgradeConfidence(confidence, input.baseline_confidence);
  if (ltrPresent) confidence = downgradeConfidence(confidence, input.ltr_confidence);

  if (sentimentPresent && input.reviews_analyzed < 30) {
    confidence = downgradeConfidence(confidence, 'low');
  } else if (sentimentPresent && input.reviews_analyzed < 100) {
    confidence = downgradeConfidence(confidence, 'medium');
  }

  if (contributorsCount <= 2) {
    confidence = downgradeConfidence(confidence, 'low');
  } else if (contributorsCount === 3) {
    confidence = downgradeConfidence(confidence, 'medium');
  }

  return {
    score: Math.round(score * 100) / 100,
    confidence,
    components: {
      baseline: Math.round(baselineComponent * 100) / 100,
      cap_rate: Math.round(capRateComponent * 100) / 100,
      ltr_regime: Math.round(ltrComponent * 100) / 100,
      sentiment: Math.round(sentimentComponent * 100) / 100,
      momentum: Math.round(momentumComponent * 100) / 100,
    },
    weights_applied: {
      baseline: Math.round(wBaseline * 10000) / 10000,
      cap_rate: Math.round(wCapRate * 10000) / 10000,
      ltr_regime: Math.round(wLtr * 10000) / 10000,
      sentiment: Math.round(wSentiment * 10000) / 10000,
      momentum: Math.round(wMomentum * 10000) / 10000,
    },
    inputs_present: presentMask,
    contributors_count: contributorsCount,
  };
}
