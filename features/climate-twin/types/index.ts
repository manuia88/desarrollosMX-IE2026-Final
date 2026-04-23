// BLOQUE 11.P — shared contracts Climate Twin (histórico 15y).
// Diferencia con `climate_future_projections` (proyecciones H2 2040/2050):
// Climate Twin usa aggregates NOAA+CONAGUA históricos 2011-2026 para twin
// similarity por signature vector(12).

export const CLIMATE_METHODOLOGY = 'heuristic_v1' as const;
export const CLIMATE_SIGNATURE_DIM = 12 as const;
export const DEFAULT_HISTORY_YEARS = 15 as const;
export const DEFAULT_HISTORY_MONTHS = 240 as const; // 20 años margen visual (cap UI chart).

export const CLIMATE_SOURCES = ['heuristic_v1', 'noaa', 'conagua', 'hybrid'] as const;
export type ClimateSource = (typeof CLIMATE_SOURCES)[number];

export const CLIMATE_TYPES = [
  'tropical',
  'arid',
  'temperate',
  'cold',
  'humid_subtropical',
] as const;
export type ClimateType = (typeof CLIMATE_TYPES)[number];

// Feature order canónico del signature vector(12). Inmutable — cambiar
// orden invalida matches persistidos. Agregar features por el final y bump
// methodology.
export const SIGNATURE_FEATURES = [
  'temp_avg',
  'temp_range',
  'rainfall_total_y',
  'rainfall_variability',
  'humidity_avg',
  'humidity_range',
  'extreme_heat_days',
  'extreme_cold_days',
  'flood_risk_score',
  'drought_risk_score',
  'seasonality_index',
  'climate_change_delta',
] as const;
export type SignatureFeature = (typeof SIGNATURE_FEATURES)[number];

export interface MonthlyAggregate {
  readonly zone_id: string;
  readonly year_month: string; // yyyy-mm-01
  readonly temp_avg: number | null;
  readonly temp_max: number | null;
  readonly temp_min: number | null;
  readonly rainfall_mm: number | null;
  readonly humidity_avg: number | null;
  readonly extreme_events_count: Readonly<Record<string, number>>;
  readonly source: ClimateSource;
}

export interface ClimateSignatureVector {
  readonly features: readonly number[]; // dim 12
  readonly features_version: string;
}

export interface ClimateTwinResult {
  readonly zone_id: string;
  readonly twin_zone_id: string;
  readonly twin_label: string | null;
  readonly similarity: number; // 0..100
  readonly shared_patterns: Readonly<Record<string, number>>;
}

export interface ClimateAnnualSummary {
  readonly zone_id: string;
  readonly year: number;
  readonly climate_type: ClimateType | null;
  readonly signature: readonly number[];
  readonly summary: Readonly<Record<string, unknown>>;
}
