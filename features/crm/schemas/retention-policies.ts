import { z } from 'zod';
import { countryCodeEnum, uuidSchema } from './shared';

export const retentionEntityTypeEnum = z.enum([
  'lead',
  'deal',
  'operacion',
  'buyer_twin',
  'fiscal_doc',
  'behavioral_signal',
  'audit_crm_log',
]);
export type RetentionEntityType = z.infer<typeof retentionEntityTypeEnum>;

export const retentionPolicySchema = z.object({
  id: uuidSchema,
  country_code: countryCodeEnum,
  entity_type: retentionEntityTypeEnum,
  retention_years: z.number().int().min(1).max(50),
  jurisdiction_ref: z.string().min(1),
  notes: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;

export const retentionPoliciesListInput = z.object({
  country_code: countryCodeEnum.optional(),
  entity_type: retentionEntityTypeEnum.optional(),
});
export type RetentionPoliciesListInput = z.infer<typeof retentionPoliciesListInput>;
