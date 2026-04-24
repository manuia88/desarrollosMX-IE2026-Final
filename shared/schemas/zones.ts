import { z } from 'zod';

export const zoneScopeTypeSchema = z.enum([
  'country',
  'region',
  'estado',
  'provincia',
  'departamento',
  'state',
  'territory',
  'city',
  'ciudad',
  'cidade',
  'county',
  'municipio',
  'alcaldia',
  'partido',
  'delegacao',
  'barrio',
  'colonia',
  'bairro',
  'neighborhood',
  'suburb',
  'zip',
  'census_tract',
]);
export type ZoneScopeType = z.infer<typeof zoneScopeTypeSchema>;

export const zoneCountryCodeSchema = z.enum(['MX', 'CO', 'AR', 'BR', 'US', 'XX']);
export type ZoneCountryCode = z.infer<typeof zoneCountryCodeSchema>;

export const zoneDataSourceSchema = z.enum(['inegi', 'dane', 'ibge', 'census', 'osm', 'manual']);
export type ZoneDataSource = z.infer<typeof zoneDataSourceSchema>;

export const zoneMetadataSchema = z
  .object({
    admin_level: z.number().int().min(2).max(11),
    data_source: zoneDataSourceSchema.default('manual'),
    seed_version: z.string().default('v1_h1_cdmx'),
  })
  .passthrough();
export type ZoneMetadata = z.infer<typeof zoneMetadataSchema>;

export const zoneEntrySchema = z
  .object({
    scope_type: zoneScopeTypeSchema,
    scope_id: z.string().min(1),
    country_code: zoneCountryCodeSchema,
    name_es: z.string().min(1),
    name_en: z.string().min(1),
    name_pt: z.string().nullable().optional(),
    parent_scope_id: z.string().nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    area_km2: z.number().positive().nullable().optional(),
    population: z.number().int().nonnegative().nullable().optional(),
    metadata: zoneMetadataSchema,
  })
  .strict();
export type ZoneEntry = z.infer<typeof zoneEntrySchema>;

export const zoneNestedFileSchema = z
  .object({
    alcaldia: zoneEntrySchema,
    colonias: z.array(zoneEntrySchema),
  })
  .strict();
export type ZoneNestedFile = z.infer<typeof zoneNestedFileSchema>;
