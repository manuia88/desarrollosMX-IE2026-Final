// ADR-059 — Querétaro city expansion (FASE 14.1) — re-exports.

export type { LoadQueretaroZonesResult } from './data-loader';
export {
  isQroZoneScopeId,
  loadQueretaroZones,
  QRO_COUNTRY_CODE,
  QRO_PARENT_SCOPE_ID,
  QRO_SCOPE_TYPE,
  QRO_ZONES_CANON,
} from './data-loader';
export {
  getQroI18n,
  QRO_I18N_EN_US,
  QRO_I18N_ES_MX,
  QRO_I18N_NAMESPACE,
} from './i18n-keys';
export {
  calculateQueretaroIEScores,
  getQueretaroScoreRange,
} from './ie-scores-calculator';
export type {
  QroI18nKeys,
  QroIEScore,
  QroScoreProvenance,
  QroScoreType,
  QroZoneCanon,
  QroZoneScopeId,
} from './types';
