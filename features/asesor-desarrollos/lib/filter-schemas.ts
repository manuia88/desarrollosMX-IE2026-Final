import { z } from 'zod';

export const tabEnum = z.enum(['own', 'exclusive', 'dmx', 'mls']);
export const sortEnum = z.enum(['byScore', 'byPrice', 'byDate', 'byMomentum']);
export const tipoEnum = z.enum(['departamento', 'casa', 'terreno', 'oficina', 'local']);
export const paneEnum = z.enum([
  'overview',
  'unidades',
  'galeria',
  'documentos',
  'scores',
  'competencia',
]);

export const filtersSchema = z.object({
  tab: tabEnum.default('own'),
  sort: sortEnum.default('byScore'),
  q: z.string().max(80).optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().max(80).optional(),
  colonia: z.string().max(80).optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  bedrooms: z.string().optional(),
  amenities: z.string().optional(),
  tipo: tipoEnum.optional(),
  drawer: z.string().uuid().optional(),
  pane: paneEnum.default('overview'),
});

export type DesarrollosFilters = z.infer<typeof filtersSchema>;
export type DesarrollosSearchParams = Partial<Record<keyof DesarrollosFilters, string>>;
export type TabKey = z.infer<typeof tabEnum>;
export type SortKey = z.infer<typeof sortEnum>;
export type TipoKey = z.infer<typeof tipoEnum>;
export type PaneKey = z.infer<typeof paneEnum>;

export const TAB_KEYS: readonly TabKey[] = ['own', 'exclusive', 'dmx', 'mls'] as const;
export const SORT_KEYS: readonly SortKey[] = [
  'byScore',
  'byPrice',
  'byDate',
  'byMomentum',
] as const;
export const PANE_KEYS: readonly PaneKey[] = [
  'overview',
  'unidades',
  'galeria',
  'documentos',
  'scores',
  'competencia',
] as const;
