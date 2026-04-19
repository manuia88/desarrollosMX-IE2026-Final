import { z } from 'zod';

export const strViabilityGetForPropertyInput = z.object({
  market_id: z.string().uuid(),
  property_price_minor: z.number().int().positive(),
  zone_tier: z.enum(['cdmx_premium', 'cdmx_standard', 'playa', 'regional']).optional(),
  num_months: z.number().int().min(1).max(24).default(12),
});

export type StrViabilityGetForPropertyInput = z.infer<typeof strViabilityGetForPropertyInput>;

export const strViabilityOutput = z.object({
  market_id: z.string().uuid(),
  zone_tier: z.enum(['cdmx_premium', 'cdmx_standard', 'playa', 'regional']),
  currency: z.string().length(3),
  gross_revenue_annual_minor: z.number().int(),
  net_revenue_annual_minor: z.number().int(),
  total_costs_annual_minor: z.number().int(),
  cap_rate: z.number(),
  breakeven_months: z.number(),
  margin_pct: z.number(),
  confidence: z.enum(['high', 'medium', 'low', 'insufficient_data']),
  inputs: z.object({
    adr_minor_avg: z.number(),
    occupancy_rate_avg: z.number(),
    sample_months: z.number().int(),
  }),
  breakdown: z.object({
    cleaning_annual_minor: z.number().int(),
    platform_fee_annual_minor: z.number().int(),
    property_mgmt_annual_minor: z.number().int(),
    utilities_annual_minor: z.number().int(),
    property_tax_annual_minor: z.number().int(),
    vacancy_buffer_annual_minor: z.number().int(),
  }),
});

export type StrViabilityOutput = z.infer<typeof strViabilityOutput>;
