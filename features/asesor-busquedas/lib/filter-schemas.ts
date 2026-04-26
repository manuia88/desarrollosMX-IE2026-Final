import { z } from 'zod';

export const tabEnum = z.enum(['activa', 'pausada', 'cerrada']);
export const sortEnum = z.enum(['byMatched', 'byLastRun', 'byCreated']);
export const tipoEnum = z.enum(['departamento', 'casa', 'terreno', 'oficina', 'local']);
export const operacionEnum = z.enum(['venta', 'renta']);
export const currencyEnum = z.enum(['MXN', 'USD']);

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

export type BusquedaCriteria = z.infer<typeof criteriaSchema>;

export const filtersSchema = z.object({
  tab: tabEnum.default('activa'),
  sort: sortEnum.default('byLastRun'),
  q: z.string().max(80).optional(),
  countryCode: z.string().length(2).optional(),
  tipo: tipoEnum.optional(),
  operacion: operacionEnum.optional(),
  drawer: z.string().uuid().optional(),
});

export type BusquedasFilters = z.infer<typeof filtersSchema>;
export type BusquedasSearchParams = Partial<Record<keyof BusquedasFilters, string>>;
export type TabKey = z.infer<typeof tabEnum>;
export type SortKey = z.infer<typeof sortEnum>;
export type TipoKey = z.infer<typeof tipoEnum>;
export type OperacionKey = z.infer<typeof operacionEnum>;
export type CurrencyKey = z.infer<typeof currencyEnum>;

export const TAB_KEYS: readonly TabKey[] = ['activa', 'pausada', 'cerrada'] as const;
export const SORT_KEYS: readonly SortKey[] = ['byMatched', 'byLastRun', 'byCreated'] as const;
