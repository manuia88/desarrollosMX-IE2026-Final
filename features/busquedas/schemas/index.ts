import { z } from 'zod';

export const tipoEnum = z.enum(['departamento', 'casa', 'terreno', 'oficina', 'local']);
export const operacionEnum = z.enum(['venta', 'renta']);
export const currencyEnum = z.enum(['MXN', 'USD']);
export const statusEnum = z.enum(['activa', 'pausada', 'cerrada']);

export const criteriaSchema = z.object({
  tipo: tipoEnum.optional(),
  operacion: operacionEnum.default('venta'),
  zone_ids: z.array(z.string().uuid()).max(20).default([]),
  ciudades: z.array(z.string().max(80)).max(10).default([]),
  price_min: z.number().nonnegative().optional(),
  price_max: z.number().positive().optional(),
  currency: currencyEnum.default('MXN'),
  recamaras_min: z.number().int().min(0).max(10).optional(),
  recamaras_max: z.number().int().min(0).max(10).optional(),
  amenities: z.array(z.string().max(40)).max(20).default([]),
});

export const busquedaListInput = z.object({
  status: statusEnum.optional(),
  leadId: z.string().uuid().optional(),
  asesorId: z.string().uuid().optional(),
  countryCode: z.string().length(2).optional(),
  q: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(200).default(60),
  cursor: z.string().optional(),
});

export const busquedaGetInput = z.object({
  id: z.string().uuid(),
});

export const busquedaCreateInput = z.object({
  leadId: z.string().uuid(),
  countryCode: z.string().length(2),
  criteria: criteriaSchema,
  notes: z.string().max(2000).optional(),
});

export const busquedaUpdateInput = z.object({
  id: z.string().uuid(),
  criteria: criteriaSchema.partial().optional(),
  notes: z.string().max(2000).optional(),
});

export const busquedaIdInput = z.object({
  id: z.string().uuid(),
});

export type BusquedaCriteria = z.infer<typeof criteriaSchema>;
export type BusquedaListInput = z.infer<typeof busquedaListInput>;
export type BusquedaCreateInput = z.infer<typeof busquedaCreateInput>;
export type BusquedaUpdateInput = z.infer<typeof busquedaUpdateInput>;
