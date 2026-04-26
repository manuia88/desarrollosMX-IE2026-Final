import { z } from 'zod';

export const leadSourceSlugEnum = z.enum([
  'whatsapp',
  'web_organic',
  'web_paid',
  'ferreteria',
  'casa_abierta',
  'listing_inbound',
  'referral',
  'partner_developer',
]);
export type LeadSourceSlug = z.infer<typeof leadSourceSlugEnum>;

export const leadSourceSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/),
  label_es: z.string().min(1),
  label_en: z.string().min(1),
  attribution_weight: z.number().min(0).max(1),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LeadSource = z.infer<typeof leadSourceSchema>;
