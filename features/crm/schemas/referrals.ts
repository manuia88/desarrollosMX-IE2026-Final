import { z } from 'zod';
import { countryCodeEnum, currencyCodeEnum, uuidSchema } from './shared';

export const referralSourceTypeEnum = z.enum(['user', 'developer', 'deal']);
export type ReferralSourceType = z.infer<typeof referralSourceTypeEnum>;

export const referralTargetTypeEnum = z.enum(['user', 'deal', 'operacion']);
export type ReferralTargetType = z.infer<typeof referralTargetTypeEnum>;

export const referralStatusEnum = z.enum(['pending', 'attributed', 'paid', 'expired', 'rejected']);
export type ReferralStatus = z.infer<typeof referralStatusEnum>;

export const referralRewardTypeEnum = z.enum(['commission', 'credit', 'discount', 'gift_card']);
export type ReferralRewardType = z.infer<typeof referralRewardTypeEnum>;

export const attributionChainEntrySchema = z.object({
  hop: z.number().int().min(1),
  referrer_id: uuidSchema,
  timestamp: z.string(),
  weight: z.number().min(0).max(1),
});
export type AttributionChainEntry = z.infer<typeof attributionChainEntrySchema>;

export const referralSchema = z
  .object({
    id: uuidSchema,
    source_type: referralSourceTypeEnum,
    source_id: uuidSchema,
    target_type: referralTargetTypeEnum,
    target_id: uuidSchema,
    persona_type_id: uuidSchema.nullable(),
    status: referralStatusEnum,
    attribution_chain: z.array(attributionChainEntrySchema),
    reward_amount: z.number().nullable(),
    reward_currency: currencyCodeEnum.nullable(),
    country_code: countryCodeEnum,
    expires_at: z.string().nullable(),
    attributed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .refine((data) => !(data.source_type === data.target_type && data.source_id === data.target_id), {
    message: 'self_referral_blocked',
  });
export type Referral = z.infer<typeof referralSchema>;

export const referralAttributeInput = z.object({
  source_type: referralSourceTypeEnum,
  source_id: uuidSchema,
  target_type: referralTargetTypeEnum,
  target_id: uuidSchema,
  persona_type_id: uuidSchema.optional(),
  country_code: countryCodeEnum,
  reward_amount: z.number().nonnegative().optional(),
  reward_currency: currencyCodeEnum.optional(),
  expires_at: z.string().datetime().optional(),
});
export type ReferralAttributeInput = z.infer<typeof referralAttributeInput>;

export const referralListInput = z.object({
  status: referralStatusEnum.optional(),
  country_code: countryCodeEnum.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: uuidSchema.optional(),
});
export type ReferralListInput = z.infer<typeof referralListInput>;

export const referralRewardSchema = z.object({
  id: uuidSchema,
  referral_id: uuidSchema,
  reward_type: referralRewardTypeEnum,
  amount: z.number().positive(),
  amount_currency: currencyCodeEnum,
  operacion_id: uuidSchema.nullable(),
  paid_at: z.string().nullable(),
  payment_method: z.string().nullable(),
  payment_reference: z.string().nullable(),
  created_at: z.string(),
});
export type ReferralReward = z.infer<typeof referralRewardSchema>;

export const referralRewardPayInput = z.object({
  reward_id: uuidSchema,
  payment_method: z.string().min(1).max(50),
  payment_reference: z.string().min(1).max(200),
});
export type ReferralRewardPayInput = z.infer<typeof referralRewardPayInput>;
