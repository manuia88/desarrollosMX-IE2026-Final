import { z } from 'zod';
import { CLIMATE_SIGNATURE_DIM, CLIMATE_SOURCES, CLIMATE_TYPES } from '../types';

export const climateSourceSchema = z.enum(CLIMATE_SOURCES);
export const climateTypeSchema = z.enum(CLIMATE_TYPES);

export const monthlyAggregateSchema = z.object({
  zone_id: z.string().uuid(),
  year_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, 'year_month must be yyyy-mm-01'),
  temp_avg: z.number().nullable(),
  temp_max: z.number().nullable(),
  temp_min: z.number().nullable(),
  rainfall_mm: z.number().min(0).nullable(),
  humidity_avg: z.number().min(0).max(100).nullable(),
  extreme_events_count: z.record(z.string(), z.number().int().min(0)),
  source: climateSourceSchema,
});

export const signatureVectorSchema = z.object({
  features: z.array(z.number()).length(CLIMATE_SIGNATURE_DIM),
  features_version: z.string(),
});

export const climateTwinInputSchema = z.object({
  zoneId: z.string().uuid(),
  topN: z.number().int().min(1).max(50).default(10),
  minSimilarity: z.number().min(0).max(100).default(70),
});

export type ClimateTwinInput = z.infer<typeof climateTwinInputSchema>;
export type MonthlyAggregateShape = z.infer<typeof monthlyAggregateSchema>;
