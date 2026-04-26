import { z } from 'zod';

export const captacionStatusEnum = z.enum([
  'prospecto',
  'presentacion',
  'firmado',
  'en_promocion',
  'vendido',
  'cerrado_no_listado',
]);
export type CaptacionStatusKey = z.infer<typeof captacionStatusEnum>;

export const captacionOperacionEnum = z.enum(['venta', 'renta']);
export type CaptacionOperacionKey = z.infer<typeof captacionOperacionEnum>;

export const sortEnum = z.enum(['byUpdated', 'byCreated', 'byPrecio']);
export type SortKey = z.infer<typeof sortEnum>;

export const filtersSchema = z.object({
  sort: sortEnum.default('byUpdated'),
  q: z.string().max(80).optional(),
  countryCode: z.string().length(2).optional(),
  status: captacionStatusEnum.optional(),
  operacion: captacionOperacionEnum.optional(),
  drawer: z.string().uuid().optional(),
  view: z.enum(['kanban', 'list']).default('kanban'),
});

export type CaptacionesFilters = z.infer<typeof filtersSchema>;
export type CaptacionesSearchParams = Partial<Record<keyof CaptacionesFilters, string>>;

export const STATUS_KEYS: readonly CaptacionStatusKey[] = [
  'prospecto',
  'presentacion',
  'firmado',
  'en_promocion',
  'vendido',
  'cerrado_no_listado',
] as const;
