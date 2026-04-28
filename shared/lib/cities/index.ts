// ADR-059 — Cities lib barrel export.
// NOTE: registry.ts is the canonical source-of-truth (NOT modified here).

export type {
  CityKpis,
  CityProjectSummary,
  CityZoneSummary,
} from './cross-feature-cities';
export {
  getCityKpis,
  getProjectsByCity,
  getZonesByCity,
} from './cross-feature-cities';
export type { CitySettings, CityStatus } from './registry';
export {
  ACTIVE_CITIES,
  getActiveCities,
  getCitiesByStatus,
  getCitySettings,
  isCityActive,
} from './registry';
