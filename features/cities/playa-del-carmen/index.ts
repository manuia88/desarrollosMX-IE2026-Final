// ADR-059 — Playa del Carmen city expansion barrel
// FASE 14.1 sub-agent 1

export type {
  LoadPlayaZonesResult,
  ZoneInsertPlaya,
} from './data-loader';
export { generateZoneIdPlaya, loadPlayaZones, PLAYA_ZONES_CANON } from './data-loader';
export { PLAYA_I18N_EN_US, PLAYA_I18N_ES_MX } from './i18n-keys';
export type {
  CalculatePlayaIEScoresResult,
  PlayaScoreInput,
  PlayaScoreRow,
  PlayaScoreType,
} from './ie-scores-calculator';
export { calculatePlayaIEScores } from './ie-scores-calculator';
export type {
  PlayaProjectSummary,
  PlayaScoreSnapshot,
  PlayaZoneSummary,
} from './types';
