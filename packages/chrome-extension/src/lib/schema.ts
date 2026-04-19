import { z } from 'zod';
import { portalIdSchema } from './portals';

export const operationTypeSchema = z.enum(['venta', 'renta']);
export const propertyTypeSchema = z.enum([
  'casa',
  'departamento',
  'terreno',
  'local',
  'oficina',
  'otro',
]);
export const sellerTypeSchema = z.enum(['particular', 'inmobiliaria', 'desconocido']);
export const currencySchema = z.enum(['MXN', 'USD']);

export const marketCaptureSchema = z.object({
  portal: portalIdSchema,
  listing_id: z.string().min(1).max(120),
  url: z.string().url(),
  price_listed: z.number().positive(),
  currency: currencySchema,
  operation_type: operationTypeSchema,
  property_type: propertyTypeSchema,
  sqm_construction: z.number().positive().optional(),
  sqm_terrain: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  parking: z.number().int().min(0).max(20).optional(),
  address_raw: z.string().min(5).max(500),
  amenities: z.array(z.string().max(80)).max(40).default([]),
  seller_type: sellerTypeSchema.default('desconocido'),
  days_on_market: z.number().int().min(0).max(3650).optional(),
  raw_html_hash: z.string().length(64),
  captured_at: z.string().datetime(),
});

export type MarketCapture = z.infer<typeof marketCaptureSchema>;
