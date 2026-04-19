// LTR-STR Opportunity score (FASE 07b / BLOQUE 7b.C).
//
// Score 0-100 por zona_id que premia regimes donde STR supera LTR con
// sample_size suficiente. Penaliza faltante de datos (cualquier lado).
//
// Input: row de v_ltr_str_connection (str_ltr_ratio + sample counts).
// Output: { score, regime, confidence, ratio, samples }.

export type LtrStrRegime =
  | 'str_strongly_outperforms'
  | 'str_outperforms'
  | 'parity'
  | 'ltr_outperforms'
  | 'unknown';

export interface LtrStrConnectionRow {
  readonly str_ltr_ratio: number | null;
  readonly regime: LtrStrRegime;
  readonly str_sample_months: number;
  readonly ltr_sample_listings: number;
}

export interface LtrStrOpportunityResult {
  readonly score: number; // 0-100
  readonly regime: LtrStrRegime;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly ratio: number | null;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

const REGIME_BASE_SCORE: Record<LtrStrRegime, number> = {
  str_strongly_outperforms: 90,
  str_outperforms: 70,
  parity: 50,
  ltr_outperforms: 20,
  unknown: 0,
};

export function computeLtrStrOpportunity(row: LtrStrConnectionRow): LtrStrOpportunityResult {
  const { regime, str_sample_months, ltr_sample_listings, str_ltr_ratio } = row;

  if (regime === 'unknown' || str_sample_months === 0 || ltr_sample_listings === 0) {
    return {
      score: 0,
      regime,
      confidence: 'insufficient_data',
      ratio: str_ltr_ratio,
    };
  }

  const base = REGIME_BASE_SCORE[regime];

  // Sample confidence multiplier: cada lado contribuye 0-1.
  const strMul = Math.min(str_sample_months / 12, 1);
  const ltrMul = Math.min(ltr_sample_listings / 30, 1); // 30 listings = saturación.
  const sampleMul = (strMul + ltrMul) / 2;

  const score = clamp100(base * (0.7 + 0.3 * sampleMul));

  const confidence: LtrStrOpportunityResult['confidence'] = (() => {
    if (str_sample_months >= 12 && ltr_sample_listings >= 30) return 'high';
    if (str_sample_months >= 6 && ltr_sample_listings >= 15) return 'medium';
    return 'low';
  })();

  return {
    score: Math.round(score * 100) / 100,
    regime,
    confidence,
    ratio: str_ltr_ratio,
  };
}
