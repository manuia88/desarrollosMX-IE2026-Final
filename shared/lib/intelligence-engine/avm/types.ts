// AVM MVP I01 — tipos compartidos. Ref: FASE_08 §BLOQUE 8.D + 03.8 §I01.

export type TipoPropiedad = 'depto' | 'casa' | 'townhouse' | 'studio';
export type OrientacionCardinal = 'N' | 'S' | 'E' | 'O';
export type EstadoConservacion = 'nuevo' | 'excelente' | 'bueno' | 'regular' | 'obra_gris';

export interface AvmPropertyInput {
  readonly lat: number;
  readonly lng: number;
  readonly sup_m2: number;
  readonly recamaras: number;
  readonly banos: number;
  readonly amenidades: readonly string[];
  readonly estado_conservacion: EstadoConservacion;
  readonly tipo_propiedad: TipoPropiedad;
  readonly sup_terreno_m2?: number;
  readonly medio_banos?: number;
  readonly estacionamientos?: number;
  readonly edad_anos?: number;
  readonly piso?: number;
  readonly condiciones?: {
    readonly roof_garden?: boolean;
    readonly orientacion?: OrientacionCardinal;
    readonly vista_parque?: boolean;
    readonly amenidades_premium_count?: number;
    readonly anos_escritura?: number;
    readonly seguridad_interna?: boolean;
    readonly mascotas_ok?: boolean;
  };
}

export interface AvmFeatureVector {
  readonly values: readonly number[]; // length === 47
  readonly missing_fields: readonly string[];
  readonly feature_names: readonly string[]; // length === 47, mismo orden que values
}

export interface AvmPredictionResult {
  readonly estimate: number;
  readonly mae_estimated_pct: number;
  readonly confidence_score: number;
}

export interface AvmComparable {
  readonly id: string;
  readonly distance_m: number;
  readonly similarity_score: number;
  readonly price_m2: number;
}

export type AdjustmentSource = 'regression_coefficient' | 'comparable_overlay' | 'market_context';

export type AdjustmentConfidence = 'high' | 'medium' | 'low';

export interface AvmAdjustment {
  readonly feature: string;
  readonly value_pct: number;
  readonly source: AdjustmentSource;
  readonly weight: number;
  readonly confidence: AdjustmentConfidence;
  readonly explanation_i18n_key: string;
}

export interface AvmMarketContext {
  readonly precio_m2_zona_p50: number | null;
  readonly absorcion_12m: number | null;
  readonly momentum_n11: number | null;
  readonly last_data_update: string | null;
}
