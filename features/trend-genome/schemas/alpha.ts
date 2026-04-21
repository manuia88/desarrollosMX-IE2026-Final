import { z } from 'zod';

// Zod schemas para Trend Genome (BLOQUE 11.H). Single Source of Truth para
// tRPC inputs + Supabase row parsing.

export const alphaScopeTypeSchema = z.enum(['colonia', 'alcaldia', 'city', 'estado']);
export const alphaCountryCodeSchema = z.string().length(2).default('MX');
export const alphaIsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const alphaTierSchema = z.enum([
  'confirmed',
  'speculative',
  'golden_opportunity',
  'watchlist',
]);

export const alphaConfidenceSchema = z.enum(['high', 'medium', 'low', 'insufficient_data']);

export const alphaAlertChannelSchema = z.enum(['email', 'whatsapp', 'push']);

// ---------------- tRPC inputs ----------------

export const getAlphaZonesInput = z.object({
  country: alphaCountryCodeSchema,
  scopeType: alphaScopeTypeSchema.default('colonia'),
  limit: z.number().int().min(1).max(100).default(20),
  minScore: z.number().min(0).max(100).optional(),
  tier: alphaTierSchema.optional(),
});
export type GetAlphaZonesInput = z.infer<typeof getAlphaZonesInput>;

export const getAlphaZoneDetailInput = z.object({
  zoneId: z.string().min(1).max(128),
  country: alphaCountryCodeSchema,
});
export type GetAlphaZoneDetailInput = z.infer<typeof getAlphaZoneDetailInput>;

export const subscribeToAlphaAlertsInput = z.object({
  zoneId: z.string().min(1).max(128),
  channel: alphaAlertChannelSchema,
  country: alphaCountryCodeSchema,
});
export type SubscribeToAlphaAlertsInput = z.infer<typeof subscribeToAlphaAlertsInput>;

export const getAlphaCountInput = z.object({
  country: alphaCountryCodeSchema,
});
export type GetAlphaCountInput = z.infer<typeof getAlphaCountInput>;

export const getAlphaAccuracyInput = z.object({
  country: alphaCountryCodeSchema,
  monthsLookback: z.number().int().min(3).max(36).default(12),
});
export type GetAlphaAccuracyInput = z.infer<typeof getAlphaAccuracyInput>;

// ---------------- BD row schemas ----------------

export const zoneAlphaAlertRowSchema = z.object({
  id: z.string(),
  zone_id: z.string(),
  scope_type: alphaScopeTypeSchema,
  country_code: z.string(),
  alpha_score: z.number(),
  time_to_mainstream_months: z.number().int().nullable(),
  signals: z.record(z.string(), z.unknown()),
  detected_at: z.string(),
  subscribers_notified: z.number().int(),
  is_active: z.boolean(),
});

export const influencerHeatRowSchema = z.object({
  id: z.string(),
  zone_id: z.string(),
  scope_type: alphaScopeTypeSchema,
  country_code: z.string(),
  period_date: z.string(),
  chef_count: z.number().int(),
  gallery_count: z.number().int(),
  creator_count: z.number().int(),
  specialty_cafe_count: z.number().int(),
  heat_score: z.number().nullable(),
  sources: z.record(z.string(), z.unknown()),
  calculated_at: z.string(),
});
