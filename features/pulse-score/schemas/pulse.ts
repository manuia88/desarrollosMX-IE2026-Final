import { z } from 'zod';

export const pulseScopeTypeSchema = z.enum(['colonia', 'alcaldia', 'city', 'estado']);
export const pulseConfidenceSchema = z.enum(['high', 'medium', 'low', 'insufficient_data']);
export const pulseCountryCodeSchema = z.string().length(2).default('MX');
export const pulseIsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const getPulseScoreInput = z.object({
  scopeType: pulseScopeTypeSchema,
  scopeId: z.string().min(1).max(128),
  country: pulseCountryCodeSchema,
  periodDate: pulseIsoDateSchema.optional(),
});
export type GetPulseScoreInput = z.infer<typeof getPulseScoreInput>;

export const getPulseHistoryInput = z.object({
  scopeType: pulseScopeTypeSchema,
  scopeId: z.string().min(1).max(128),
  country: pulseCountryCodeSchema,
  months: z.number().int().min(1).max(36).default(12),
});
export type GetPulseHistoryInput = z.infer<typeof getPulseHistoryInput>;

export const pulseComponentSchema = z.object({
  value: z.number().nullable(),
  weight: z.number(),
  source: z.string(),
  available: z.boolean(),
});

export const pulseScoreRowSchema = z.object({
  id: z.string(),
  scope_type: pulseScopeTypeSchema,
  scope_id: z.string(),
  country_code: z.string(),
  period_date: z.string(),
  business_births: z.number().int(),
  business_deaths: z.number().int(),
  foot_traffic_day: z.number().nullable(),
  foot_traffic_night: z.number().nullable(),
  calls_911_count: z.number().nullable(),
  events_count: z.number().nullable(),
  pulse_score: z.number().nullable(),
  confidence: pulseConfidenceSchema.nullable(),
  components: z.record(z.string(), z.unknown()),
  calculated_at: z.string(),
});

export const pulseHistoryPointSchema = z.object({
  period_date: z.string(),
  pulse_score: z.number().nullable(),
  confidence: pulseConfidenceSchema.nullable(),
});
