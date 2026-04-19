// Schema server-side para capturas de Chrome Extension. Mirror del schema cliente
// (packages/chrome-extension/src/lib/schema.ts) con normalización a shape de DB.
//
// Refs: docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md §65-88

import { z } from 'zod';

export const PORTAL_IDS = [
  'inmuebles24',
  'vivanuncios',
  'propiedades_com',
  'ml_inmuebles',
  'fb_marketplace',
] as const;

export const portalIdSchema = z.enum(PORTAL_IDS);
export type PortalId = z.infer<typeof portalIdSchema>;

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

export const SOURCE_FOR_PORTAL: Record<PortalId, string> = {
  inmuebles24: 'chrome_ext_inmuebles24',
  vivanuncios: 'chrome_ext_vivanuncios',
  propiedades_com: 'chrome_ext_propiedades_com',
  ml_inmuebles: 'chrome_ext_ml_inmuebles',
  fb_marketplace: 'chrome_ext_fb_marketplace',
};

export interface NormalizedCaptureRow {
  source: string;
  listing_id: string;
  property_type: 'casa' | 'departamento' | 'terreno' | 'local' | 'oficina' | 'otro';
  operation: 'venta' | 'renta';
  price_minor: bigint;
  currency: 'MXN' | 'USD';
  area_built_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  address_raw: string;
  amenities: string[];
  seller_type: 'particular' | 'inmobiliaria' | 'desconocido';
  raw_html_hash: string;
  posted_at: string;
  meta: Record<string, unknown>;
}

export function normalizeCapture(payload: MarketCapture): NormalizedCaptureRow {
  const priceMinor = BigInt(Math.round(payload.price_listed * 100));
  const postedAt = payload.captured_at.slice(0, 10);
  return {
    source: SOURCE_FOR_PORTAL[payload.portal],
    listing_id: payload.listing_id,
    property_type: payload.property_type,
    operation: payload.operation_type,
    price_minor: priceMinor,
    currency: payload.currency,
    area_built_m2: payload.sqm_construction ?? null,
    bedrooms: payload.bedrooms ?? null,
    bathrooms: payload.bathrooms ?? null,
    parking: payload.parking ?? null,
    address_raw: payload.address_raw,
    amenities: payload.amenities,
    seller_type: payload.seller_type,
    raw_html_hash: payload.raw_html_hash,
    posted_at: postedAt,
    meta: {
      portal: payload.portal,
      url: payload.url,
      sqm_terrain: payload.sqm_terrain,
      days_on_market: payload.days_on_market,
      captured_at: payload.captured_at,
    },
  };
}
