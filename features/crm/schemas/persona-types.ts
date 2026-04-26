import { z } from 'zod';

export const personaTypeSlugEnum = z.enum([
  'buyer_self',
  'asesor_lead',
  'investor',
  'masterbroker',
  'family_member',
  'referrer',
]);
export type PersonaTypeSlug = z.infer<typeof personaTypeSlugEnum>;

export const personaTypeSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z][a-z0-9_]{2,40}$/),
  label_es: z.string().min(1),
  label_en: z.string().min(1),
  description: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PersonaType = z.infer<typeof personaTypeSchema>;
