// Fórmulas de scoring de zona basadas en mix SCIAN.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.F.1.3

import { SCIAN_MACRO_CATEGORY_KEYS, type ScianMacroCategoryKey } from './mapping';

export interface TierCounts {
  high: number;
  standard: number;
  basic: number;
}

export interface MacroCategoryCounts {
  [k: string]: number;
}

/**
 * Ratio Premium/Basic — mide la concentración de comercios premium en una zona.
 *  > 1.5  → zona premium
 *  ~ 1.0  → zona mixta
 *  < 0.5  → zona predominantemente basic
 *
 * Formula: count_high / (count_basic + 1)  (smoothed denominator).
 */
export function ratioPremiumBasic(counts: TierCounts): number {
  return counts.high / (counts.basic + 1);
}

/**
 * Shannon-Wiener diversity index sobre macro categorías.
 *  H = -Σ p_i × ln(p_i)   donde p_i = count_i / total
 *
 * Valor 0 → monopolio (una sola categoría).
 * Valor max ≈ ln(N_categories) → distribución perfectamente uniforme.
 * Para 12 categorías el techo es ln(12) ≈ 2.485.
 *
 * Zonas residenciales deseables tienden a H entre 1.6-2.2 (diverso pero no
 * fragmentado).
 */
export function shannonDiversity(counts: MacroCategoryCounts): number {
  let total = 0;
  for (const key of SCIAN_MACRO_CATEGORY_KEYS) {
    total += counts[key] ?? 0;
  }
  if (total <= 0) return 0;

  let h = 0;
  for (const key of SCIAN_MACRO_CATEGORY_KEYS) {
    const c = counts[key] ?? 0;
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log(p);
  }
  return h;
}

/**
 * Gentrification Velocity — ratio de cambio del ratio Premium/Basic vs 12 meses atrás.
 *  > 0.30 → gentrificación activa.
 *  ≈ 0    → estable.
 *  < 0    → desinversión.
 *
 * Formula: (ratio_PB_t - ratio_PB_t12) / ratio_PB_t12
 *
 * Si ratio_PB_t12 es 0 o muy bajo: returns null para evitar división por casi-cero.
 */
export function gentrificationVelocity(
  ratioPbCurrent: number,
  ratioPbTwelveMonthsAgo: number,
  options: { minBaseline?: number } = {},
): number | null {
  const { minBaseline = 0.05 } = options;
  if (!Number.isFinite(ratioPbTwelveMonthsAgo) || ratioPbTwelveMonthsAgo < minBaseline) {
    return null;
  }
  return (ratioPbCurrent - ratioPbTwelveMonthsAgo) / ratioPbTwelveMonthsAgo;
}

export interface ZoneScianStats {
  tier_counts: TierCounts;
  macro_counts: Partial<Record<ScianMacroCategoryKey, number>>;
  ratio_pb: number;
  shannon: number;
  gentrification_velocity: number | null;
  total_businesses: number;
}

export interface ZoneScianStatsInput {
  tier_counts: TierCounts;
  macro_counts: MacroCategoryCounts;
  ratio_pb_twelve_months_ago?: number;
}

export function computeZoneScianStats(input: ZoneScianStatsInput): ZoneScianStats {
  const total = input.tier_counts.high + input.tier_counts.standard + input.tier_counts.basic;
  const ratio_pb = ratioPremiumBasic(input.tier_counts);
  const shannon = shannonDiversity(input.macro_counts);
  const macroPartial: Partial<Record<ScianMacroCategoryKey, number>> = {};
  for (const key of SCIAN_MACRO_CATEGORY_KEYS) {
    if (input.macro_counts[key]) macroPartial[key] = input.macro_counts[key];
  }
  const velocity =
    typeof input.ratio_pb_twelve_months_ago === 'number'
      ? gentrificationVelocity(ratio_pb, input.ratio_pb_twelve_months_ago)
      : null;
  return {
    tier_counts: input.tier_counts,
    macro_counts: macroPartial,
    ratio_pb,
    shannon,
    gentrification_velocity: velocity,
    total_businesses: total,
  };
}
