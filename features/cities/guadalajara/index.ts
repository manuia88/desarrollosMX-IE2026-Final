// FASE 14.1 — Guadalajara city expansion (ADR-059).
// Public API barrel.

export type { LoadGdlZonesResult, ZoneInsertGdl } from './data-loader';
export { GDL_ZONES_CANON, loadGuadalajaraZones } from './data-loader';
export { GDL_I18N_EN_US, GDL_I18N_ES_MX } from './i18n-keys';
export type { CalculateGdlIEScoresResult } from './ie-scores-calculator';
export { buildGdlSyntheticScores, calculateGuadalajaraIEScores } from './ie-scores-calculator';
export type { GdlIEScoreInsert, GdlProjectSummary, GdlScoreType, GdlZoneSummary } from './types';
