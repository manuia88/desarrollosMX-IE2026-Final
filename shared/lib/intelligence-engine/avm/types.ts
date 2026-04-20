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
  readonly sup_terreno_m2?: number | undefined;
  readonly medio_banos?: number | undefined;
  readonly estacionamientos?: number | undefined;
  readonly edad_anos?: number | undefined;
  readonly piso?: number | undefined;
  readonly condiciones?:
    | {
        readonly roof_garden?: boolean | undefined;
        readonly orientacion?: OrientacionCardinal | undefined;
        readonly vista_parque?: boolean | undefined;
        readonly amenidades_premium_count?: number | undefined;
        readonly anos_escritura?: number | undefined;
        readonly seguridad_interna?: boolean | undefined;
        readonly mascotas_ok?: boolean | undefined;
      }
    | undefined;
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
