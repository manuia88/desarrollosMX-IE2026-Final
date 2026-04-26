import { z } from 'zod';
import { countryCodeEnum, uuidSchema } from './shared';

export const leadStatusEnum = z.enum(['new', 'qualified', 'nurturing', 'converted', 'lost']);
export type LeadStatus = z.infer<typeof leadStatusEnum>;

export const leadSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  zone_id: uuidSchema,
  source_id: uuidSchema,
  country_code: countryCodeEnum,
  status: leadStatusEnum,
  contact_name: z.string().min(1).max(200),
  contact_email: z.string().email().nullable(),
  contact_phone: z.string().min(6).max(30).nullable(),
  assigned_asesor_id: uuidSchema.nullable(),
  brokerage_id: uuidSchema.nullable(),
  qualification_score: z.number().min(0).max(100),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Lead = z.infer<typeof leadSchema>;

export const leadCreateInput = z
  .object({
    zone_id: uuidSchema,
    source_id: uuidSchema,
    country_code: countryCodeEnum,
    contact_name: z.string().trim().min(1).max(200),
    contact_email: z.string().trim().email().optional(),
    contact_phone: z.string().trim().min(6).max(30).optional(),
    notes: z.string().trim().max(2000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Boolean(data.contact_email) || Boolean(data.contact_phone), {
    message: 'contact_email_or_phone_required',
  });
export type LeadCreateInput = z.infer<typeof leadCreateInput>;

export const leadUpdateStatusInput = z.object({
  lead_id: uuidSchema,
  status: leadStatusEnum,
});
export type LeadUpdateStatusInput = z.infer<typeof leadUpdateStatusInput>;

export const leadAssignInput = z.object({
  lead_id: uuidSchema,
  assigned_asesor_id: uuidSchema,
});
export type LeadAssignInput = z.infer<typeof leadAssignInput>;

export const leadListInput = z.object({
  status: leadStatusEnum.optional(),
  country_code: countryCodeEnum.optional(),
  assigned_asesor_id: uuidSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: uuidSchema.optional(),
});
export type LeadListInput = z.infer<typeof leadListInput>;
