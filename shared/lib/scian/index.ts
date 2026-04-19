// Public API SCIAN — mapping + formulas + staff midpoint.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.F.1

export type {
  MacroCategoryCounts,
  TierCounts,
  ZoneScianStats,
  ZoneScianStatsInput,
} from './formulas';
export {
  computeZoneScianStats,
  gentrificationVelocity,
  ratioPremiumBasic,
  shannonDiversity,
} from './formulas';
export type {
  ScianMacroCategory,
  ScianMacroCategoryKey,
  ScianTier,
} from './mapping';
export {
  macroCategoryForScian,
  SCIAN_MACRO_CATEGORIES,
  SCIAN_MACRO_CATEGORY_KEYS,
  SCIAN_TIER_PREFIXES,
  tierForScian,
} from './mapping';

export { staffMidpoint } from './staff';
