import { z } from 'zod';
import { countryCodeEnum, currencyCodeEnum, uuidSchema } from './shared';

export const traitSystemEnum = z.enum(['disc', 'big_five']);
export type TraitSystem = z.infer<typeof traitSystemEnum>;

export const discTraitCodeEnum = z.enum(['D', 'I', 'S', 'C']);
export const bigFiveTraitCodeEnum = z.enum(['O', 'C', 'E', 'A', 'N']);

export const buyerTwinTraitSchema = z
  .object({
    id: uuidSchema,
    buyer_twin_id: uuidSchema,
    trait_system: traitSystemEnum,
    trait_code: z.string().min(1).max(2),
    trait_value: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    computed_at: z.string(),
  })
  .refine(
    (data) =>
      data.trait_system === 'disc'
        ? discTraitCodeEnum.safeParse(data.trait_code).success
        : bigFiveTraitCodeEnum.safeParse(data.trait_code).success,
    { message: 'trait_code_invalid_for_system' },
  );
export type BuyerTwinTrait = z.infer<typeof buyerTwinTraitSchema>;

export const buyerTwinSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  persona_type_id: uuidSchema,
  zone_focus_ids: z.array(uuidSchema),
  price_range_min: z.number().nonnegative().nullable(),
  price_range_max: z.number().nonnegative().nullable(),
  price_range_currency: currencyCodeEnum.nullable(),
  country_code: countryCodeEnum,
  disc_profile: z.record(z.string(), z.unknown()),
  big_five_profile: z.record(z.string(), z.unknown()),
  embedding_updated_at: z.string().nullable(),
  last_signal_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BuyerTwin = z.infer<typeof buyerTwinSchema>;

export const buyerTwinCreateInput = z.object({
  persona_type_id: uuidSchema,
  zone_focus_ids: z.array(uuidSchema).default([]),
  price_range_min: z.number().nonnegative().optional(),
  price_range_max: z.number().nonnegative().optional(),
  price_range_currency: currencyCodeEnum.optional(),
  country_code: countryCodeEnum,
});
export type BuyerTwinCreateInput = z.infer<typeof buyerTwinCreateInput>;

export const buyerTwinComputeTraitsInput = z.object({
  buyer_twin_id: uuidSchema,
  disc_profile: z.record(z.string(), z.number().min(0).max(100)).optional(),
  big_five_profile: z.record(z.string(), z.number().min(0).max(100)).optional(),
});
export type BuyerTwinComputeTraitsInput = z.infer<typeof buyerTwinComputeTraitsInput>;

export const buyerTwinSearchSimilarInput = z.object({
  buyer_twin_id: uuidSchema,
  limit: z.number().int().min(1).max(50).default(10),
});
export type BuyerTwinSearchSimilarInput = z.infer<typeof buyerTwinSearchSimilarInput>;
