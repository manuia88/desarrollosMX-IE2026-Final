import { z } from 'zod';
import {
  countryCodeSchema,
  proyectoOperacionSchema,
  proyectoPrivacySchema,
  proyectoStatusSchema,
  proyectoTipoSchema,
  uuidSchema,
} from './shared';

export const proyectoSchema = z.object({
  id: uuidSchema,
  nombre: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  desarrolladora_id: uuidSchema,
  zone_id: uuidSchema.nullable(),
  country_code: countryCodeSchema,
  ciudad: z.string().nullable(),
  colonia: z.string().nullable(),
  direccion: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  status: proyectoStatusSchema,
  tipo: proyectoTipoSchema,
  operacion: proyectoOperacionSchema,
  units_total: z.number().int().nonnegative().nullable(),
  units_available: z.number().int().nonnegative().nullable(),
  price_min_mxn: z.number().positive().nullable(),
  price_max_mxn: z.number().positive().nullable(),
  currency: z.string().length(3),
  bedrooms_range: z.array(z.number().int().nonnegative()).max(2).nullable(),
  amenities: z.array(z.string()),
  description: z.string().nullable(),
  cover_photo_url: z.string().url().nullable(),
  brochure_url: z.string().url().nullable(),
  privacy_level: proyectoPrivacySchema,
  is_active: z.boolean(),
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Proyecto = z.infer<typeof proyectoSchema>;

export const proyectoListInput = z.object({
  status: proyectoStatusSchema.optional(),
  tipo: proyectoTipoSchema.optional(),
  operacion: proyectoOperacionSchema.optional(),
  country_code: countryCodeSchema.optional(),
  ciudad: z.string().max(80).optional(),
  colonia: z.string().max(80).optional(),
  zone_id: uuidSchema.optional(),
  desarrolladora_id: uuidSchema.optional(),
  brokerage_id: uuidSchema.optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  bedrooms_min: z.number().int().nonnegative().optional(),
  q: z.string().max(80).optional(),
  scope: z.enum(['own', 'exclusive', 'dmx', 'mls']).default('dmx'),
  limit: z.number().int().min(1).max(60).default(24),
  cursor: z.string().optional(),
});
export type ProyectoListInput = z.infer<typeof proyectoListInput>;

export const proyectoGetInput = z
  .object({
    id: uuidSchema.optional(),
    slug: z.string().optional(),
  })
  .refine((d) => Boolean(d.id) || Boolean(d.slug), {
    message: 'id_or_slug_required',
  });
export type ProyectoGetInput = z.infer<typeof proyectoGetInput>;

export const proyectoSearchByNameInput = z.object({
  q: z.string().min(1).max(80),
  limit: z.number().int().min(1).max(20).default(10),
});
export type ProyectoSearchByNameInput = z.infer<typeof proyectoSearchByNameInput>;
