import { z } from 'zod';
import { unidadStatusSchema, unidadTipoSchema, uuidSchema } from './shared';

export const unidadSchema = z.object({
  id: uuidSchema,
  proyecto_id: uuidSchema,
  numero: z.string().min(1).max(50),
  tipo: unidadTipoSchema,
  recamaras: z.number().int().nullable(),
  banos: z.number().nullable(),
  parking: z.number().int().nullable(),
  area_m2: z.number().nullable(),
  area_terreno_m2: z.number().nullable(),
  price_mxn: z.number().nullable(),
  maintenance_fee_mxn: z.number().nullable(),
  status: unidadStatusSchema,
  floor: z.number().int().nullable(),
  floor_plan_url: z.string().url().nullable(),
  photos: z.array(z.string()),
  features: z.record(z.string(), z.unknown()),
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Unidad = z.infer<typeof unidadSchema>;

export const unidadListInput = z.object({
  proyecto_id: uuidSchema,
  status: unidadStatusSchema.optional(),
  recamaras: z.number().int().nonnegative().optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
});
export type UnidadListInput = z.infer<typeof unidadListInput>;
