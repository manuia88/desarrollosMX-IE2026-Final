import { z } from 'zod';

export const strBreakevenComputeInput = z.object({
  market_id: z.string().uuid(),
  property_price_minor: z.number().int().positive(),
  zone_tier: z.enum(['cdmx_premium', 'cdmx_standard', 'playa', 'regional']).optional(),
  downpayment_pct: z.number().min(0.05).max(1).default(0.2),
  loan_term_years: z.number().int().min(5).max(30).default(20),
  loan_rate_annual_override: z.number().min(0).max(0.3).optional(),
  num_months: z.number().int().min(1).max(24).default(12),
});

export type StrBreakevenComputeInput = z.infer<typeof strBreakevenComputeInput>;
