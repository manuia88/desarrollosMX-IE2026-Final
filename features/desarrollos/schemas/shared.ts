import { z } from 'zod';

export const countryCodeSchema = z.enum(['MX', 'CO', 'AR', 'BR', 'US']);
export type CountryCode = z.infer<typeof countryCodeSchema>;

export const currencyCodeSchema = z.enum(['MXN', 'COP', 'ARS', 'BRL', 'USD']);
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export const uuidSchema = z.string().uuid();

export const proyectoStatusSchema = z.enum(['preventa', 'construccion', 'terminado', 'entregado']);
export type ProyectoStatus = z.infer<typeof proyectoStatusSchema>;

export const proyectoPrivacySchema = z.enum(['public', 'broker_only', 'assigned_only']);
export type ProyectoPrivacy = z.infer<typeof proyectoPrivacySchema>;

export const proyectoOperacionSchema = z.enum(['venta', 'renta']);
export type ProyectoOperacion = z.infer<typeof proyectoOperacionSchema>;

export const proyectoTipoSchema = z.enum([
  'departamento',
  'casa',
  'townhouse',
  'loft',
  'penthouse',
  'oficina',
  'local',
  'terreno',
]);
export type ProyectoTipo = z.infer<typeof proyectoTipoSchema>;

export const unidadStatusSchema = z.enum([
  'disponible',
  'apartada',
  'vendida',
  'reservada',
  'bloqueada',
]);
export type UnidadStatus = z.infer<typeof unidadStatusSchema>;

export const unidadTipoSchema = z.enum([
  'departamento',
  'casa',
  'townhouse',
  'loft',
  'penthouse',
  'estudio',
]);
export type UnidadTipo = z.infer<typeof unidadTipoSchema>;

export const projectBrokerRoleSchema = z.enum(['lead_broker', 'associate', 'coordinator']);
export type ProjectBrokerRole = z.infer<typeof projectBrokerRoleSchema>;

export const marketingAssetTypeSchema = z.enum([
  'photo_gallery',
  'video',
  'video_story',
  'brochure_pdf',
  'render_3d',
  'virtual_tour',
  'floor_plan',
  'post_cuadrado',
  'post_largo',
  'story',
]);
export type MarketingAssetType = z.infer<typeof marketingAssetTypeSchema>;

export const marketingAssetStatusSchema = z.enum(['ready', 'generating', 'expired', 'error']);
export type MarketingAssetStatus = z.infer<typeof marketingAssetStatusSchema>;

export const exclusividadScopeSchema = z.enum(['full', 'category', 'territory']);
export type ExclusividadScope = z.infer<typeof exclusividadScopeSchema>;
