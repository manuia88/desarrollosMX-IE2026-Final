import { z } from 'zod';
import { marketingAssetStatusSchema, marketingAssetTypeSchema, uuidSchema } from './shared';

export const marketingAssetSchema = z.object({
  id: uuidSchema,
  proyecto_id: uuidSchema,
  asset_type: marketingAssetTypeSchema,
  url: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  format: z.string().nullable(),
  locale: z.string(),
  status: marketingAssetStatusSchema,
  display_order: z.number().int(),
  expires_at: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MarketingAsset = z.infer<typeof marketingAssetSchema>;

export const marketingAssetListInput = z.object({
  proyecto_id: uuidSchema,
  asset_type: marketingAssetTypeSchema.optional(),
});
export type MarketingAssetListInput = z.infer<typeof marketingAssetListInput>;
