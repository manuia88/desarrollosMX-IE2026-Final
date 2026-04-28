// FASE 14.1 — Dubai city expansion (ADR-059) public re-exports.

export {
  DUBAI_ZONES_CANON,
  type LoadDubaiZonesResult,
  loadDubaiZones,
  type ZoneInsertDubai,
} from './data-loader';
export {
  DUBAI_FEATURE_FLAGS,
  type DubaiFeatureFlag,
  isDubaiFlagEnabled,
} from './feature-flags';
export { DUBAI_I18N_EN_US, DUBAI_I18N_ES_MX, type DubaiI18nKey } from './i18n-keys';
export {
  calculateDubaiIEScores,
  type DubaiIEScore,
  type InsertDubaiScoresResult,
  insertDubaiSyntheticScores,
} from './ie-scores-calculator';
export {
  getProjectDetails,
  getProjectMarkers,
  listProjectsDubai,
  REELLY_BASE_URL,
  REELLY_FEATURE_FLAG,
  syncProjectsToDmx,
  testConnection,
} from './lib/reelly';
export type {
  ReellyConnectionTest,
  ReellyDeveloper,
  ReellyListProjectsFilters,
  ReellyMarker,
  ReellyNotImplementedReason,
  ReellyProject,
  ReellyProjectStatus,
  ReellySyncResult,
} from './lib/reelly/types';
export {
  AED_USD_PEG,
  type DubaiPricing,
  FALLBACK_USD_MXN_RATE,
  getDubaiPricing,
} from './multi-currency';
export type {
  DubaiIEScoreInsert,
  DubaiProjectSummary,
  DubaiScoreType,
  DubaiZoneSummary,
} from './types';
