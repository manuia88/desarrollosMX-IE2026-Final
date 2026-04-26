import { z } from 'zod';
import { countryCodeEnum, currencyCodeEnum, uuidSchema } from './shared';

export const familyUnitTypeEnum = z.enum(['couple', 'family', 'partnership', 'single']);
export type FamilyUnitType = z.infer<typeof familyUnitTypeEnum>;

export const relationshipEnum = z.enum([
  'spouse',
  'child',
  'parent',
  'sibling',
  'partner',
  'other',
]);
export type Relationship = z.infer<typeof relationshipEnum>;

export const familyUnitSchema = z.object({
  id: uuidSchema,
  primary_buyer_twin_id: uuidSchema,
  unit_type: familyUnitTypeEnum,
  members_count: z.number().int().min(1),
  combined_budget_min: z.number().nullable(),
  combined_budget_max: z.number().nullable(),
  combined_budget_currency: currencyCodeEnum.nullable(),
  country_code: countryCodeEnum,
  created_at: z.string(),
  updated_at: z.string(),
});
export type FamilyUnit = z.infer<typeof familyUnitSchema>;

export const familyUnitCreateInput = z.object({
  primary_buyer_twin_id: uuidSchema,
  unit_type: familyUnitTypeEnum,
  members_count: z.number().int().min(1).default(1),
  combined_budget_min: z.number().nonnegative().optional(),
  combined_budget_max: z.number().nonnegative().optional(),
  combined_budget_currency: currencyCodeEnum.optional(),
  country_code: countryCodeEnum,
});
export type FamilyUnitCreateInput = z.infer<typeof familyUnitCreateInput>;

export const familyUnitMemberSchema = z.object({
  id: uuidSchema,
  family_unit_id: uuidSchema,
  buyer_twin_id: uuidSchema,
  relationship: relationshipEnum,
  is_primary: z.boolean(),
  created_at: z.string(),
});
export type FamilyUnitMember = z.infer<typeof familyUnitMemberSchema>;

export const familyUnitAddMemberInput = z.object({
  family_unit_id: uuidSchema,
  buyer_twin_id: uuidSchema,
  relationship: relationshipEnum,
  is_primary: z.boolean().default(false),
});
export type FamilyUnitAddMemberInput = z.infer<typeof familyUnitAddMemberInput>;
