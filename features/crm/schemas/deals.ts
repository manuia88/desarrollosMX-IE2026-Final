import { z } from 'zod';
import { countryCodeEnum, currencyCodeEnum, moneyAmountSchema, uuidSchema } from './shared';

export const dealSchema = z.object({
  id: uuidSchema,
  lead_id: uuidSchema,
  zone_id: uuidSchema,
  property_id: uuidSchema.nullable(),
  stage_id: uuidSchema,
  amount: z.number().positive(),
  amount_currency: currencyCodeEnum,
  country_code: countryCodeEnum,
  asesor_id: uuidSchema,
  probability: z.number().min(0).max(100),
  expected_close_date: z.string().nullable(),
  actual_close_date: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Deal = z.infer<typeof dealSchema>;

export const dealCreateInput = z.object({
  lead_id: uuidSchema,
  zone_id: uuidSchema,
  property_id: uuidSchema.optional(),
  stage_id: uuidSchema,
  amount: moneyAmountSchema,
  amount_currency: currencyCodeEnum,
  country_code: countryCodeEnum,
  probability: z.number().min(0).max(100).default(50),
  expected_close_date: z.string().date().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type DealCreateInput = z.infer<typeof dealCreateInput>;

export const dealAdvanceStageInput = z.object({
  deal_id: uuidSchema,
  stage_id: uuidSchema,
});
export type DealAdvanceStageInput = z.infer<typeof dealAdvanceStageInput>;

export const dealCloseInput = z.object({
  deal_id: uuidSchema,
  outcome: z.enum(['won', 'lost']),
  actual_close_date: z.string().date().optional(),
});
export type DealCloseInput = z.infer<typeof dealCloseInput>;

export const dealListInput = z.object({
  stage_slug: z.string().optional(),
  country_code: countryCodeEnum.optional(),
  asesor_id: uuidSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: uuidSchema.optional(),
});
export type DealListInput = z.infer<typeof dealListInput>;
