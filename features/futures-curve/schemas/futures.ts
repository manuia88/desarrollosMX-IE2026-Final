import { z } from 'zod';
import { FORWARD_HORIZONS } from '../types';

export const forwardHorizonSchema = z.enum(
  FORWARD_HORIZONS.map((h) => h.toString()) as [string, ...string[]],
);

export const forwardPointSchema = z.object({
  horizon_m: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]),
  value: z.number().nullable(),
  lower: z.number().nullable(),
  upper: z.number().nullable(),
  confidence: z.number().min(0).max(100).nullable(),
});

export const forwardCurveSchema = z.object({
  index_code: z.string(),
  scope_type: z.enum(['colonia', 'alcaldia', 'city', 'estado']),
  scope_id: z.string(),
  country_code: z.string(),
  base_period_date: z.string(),
  points: z.array(forwardPointSchema),
  methodology: z.string(),
  calculated_at: z.string(),
  disclaimer: z.string(),
});

export const pulseForecastPointSchema = z.object({
  forecast_date: z.string(),
  value: z.number().min(0).max(100),
  value_lower: z.number().min(0).max(100).nullable(),
  value_upper: z.number().min(0).max(100).nullable(),
});

export const pulseForecast30dSchema = z.object({
  zone_id: z.string().uuid(),
  country_code: z.string(),
  methodology: z.string(),
  generated_at: z.string(),
  points: z.array(pulseForecastPointSchema),
  disclaimer: z.string(),
});

export const calculateForwardInputSchema = z.object({
  indexCode: z.string().min(2),
  scopeType: z.enum(['colonia', 'alcaldia', 'city', 'estado']),
  scopeId: z.string(),
  countryCode: z.string().default('MX'),
});

export const calculatePulseForecastInputSchema = z.object({
  zoneId: z.string().uuid(),
  days: z.number().int().min(7).max(60).default(30),
  countryCode: z.string().default('MX'),
});
