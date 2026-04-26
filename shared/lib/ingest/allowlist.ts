import { SourceNotAllowedError } from './types';

// Whitelist hardcoded de sources autorizadas. Espejo de
// public.ingest_allowed_sources en BD para defense-in-depth.
// Cualquier discrepancia entre code y BD → SourceNotAllowedError.
//
// Habi explícitamente NO está. Scraping server-side de
// inmuebles24/vivanuncios/propiedades.com/ML/FB Marketplace tampoco
// (ADR-012 — pivot Chrome Extension GC-27).
export const ALLOWED_SOURCES = [
  // MACRO (7)
  'banxico',
  'inegi',
  'shf',
  'bbva_research',
  'cnbv',
  'infonavit',
  'fovissste',
  // GEO (17)
  'denue',
  'fgj',
  'gtfs',
  'atlas_riesgos',
  'siged',
  'clues',
  'sacmex',
  'rama',
  'seduvi',
  'catastro_cdmx',
  'paot',
  'sedema',
  'conagua',
  'noaa',
  'inah',
  'profeco',
  'locatel',
  'mapbox_traffic',
  // MARKET (Chrome Extension + APIs oficiales + admin upload, ADR-012)
  'chrome_ext_inmuebles24',
  'chrome_ext_vivanuncios',
  'chrome_ext_propiedades_com',
  'chrome_ext_ml_inmuebles',
  'chrome_ext_fb_marketplace',
  'chrome_ext_lamudi',
  'airdna',
  'airroi',
  'airroi_mcp',
  'google_trends',
  'cushman',
  'cbre',
  'tinsa',
  'jll',
  'softec',
  'partnership_feed',
] as const;

export type AllowedSource = (typeof ALLOWED_SOURCES)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_SOURCES);

const FORBIDDEN_HOST_RE =
  /(?:apiv2\.habi\.co|habi\.co\/api|propiedades\.com\/api|inmuebles24\.com|vivanuncios\.com|propiedades\.com|mercadolibre\.com\/inmuebles|facebook\.com\/marketplace|lamudi\.com)/i;

export function assertAllowedSource(source: string): asserts source is AllowedSource {
  if (!ALLOWED_SET.has(source)) {
    throw new SourceNotAllowedError(source);
  }
}

export function assertAllowedUrl(url: string): void {
  // Bloquea URLs server-side a portales prohibidos (ADR-012). Chrome ext usa
  // este path solo para POSTear capturas a /api/market/capture, no fetchea
  // los portales desde el server.
  if (FORBIDDEN_HOST_RE.test(url)) {
    throw new SourceNotAllowedError(url);
  }
}

export function isAllowedSource(source: string): source is AllowedSource {
  return ALLOWED_SET.has(source);
}
