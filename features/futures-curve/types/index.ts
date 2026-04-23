// Shared contracts for the Futures Curve feature (BLOQUE 11.N).
// Forward curve 3/6/12/24m + banda CI 95% explícita (_lower/_upper columns
// añadidas en migration 20260423110000). Pulse Pronóstico 30d daily (L93)
// persiste en public.pulse_forecasts.

export const FORWARD_HORIZONS = [3, 6, 12, 24] as const;
export type ForwardHorizon = (typeof FORWARD_HORIZONS)[number];

export type FuturesScopeType = 'colonia' | 'alcaldia' | 'city' | 'estado';

export interface ForwardPoint {
  readonly horizon_m: ForwardHorizon;
  readonly value: number | null;
  readonly lower: number | null;
  readonly upper: number | null;
  readonly confidence: number | null; // 0..100
}

export interface ForwardCurve {
  readonly index_code: string;
  readonly scope_type: FuturesScopeType;
  readonly scope_id: string;
  readonly country_code: string;
  readonly base_period_date: string;
  readonly points: readonly ForwardPoint[];
  readonly methodology: string;
  readonly calculated_at: string;
  readonly disclaimer: string;
}

export interface PulseForecastPoint {
  readonly forecast_date: string;
  readonly value: number;
  readonly value_lower: number | null;
  readonly value_upper: number | null;
}

export interface PulseForecast30d {
  readonly zone_id: string;
  readonly country_code: string;
  readonly methodology: string;
  readonly generated_at: string;
  readonly points: readonly PulseForecastPoint[];
  readonly disclaimer: string;
}

export const FUTURES_DISCLAIMER_KEY = 'FuturesCurve.disclaimer_heuristic' as const;
export const PULSE_FORECAST_DISCLAIMER_KEY = 'FuturesCurve.pulse_disclaimer' as const;
