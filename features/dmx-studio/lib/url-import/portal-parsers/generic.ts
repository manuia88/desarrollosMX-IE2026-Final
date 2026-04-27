// F14.F.4 Sprint 3 — Generic Open Graph + JSON-LD schema.org parser.
// Fallback when no portal-specific parser matches.

import * as cheerio from 'cheerio';
import type { StudioPortal } from '@/features/dmx-studio/schemas';
import type { ExtractedListingData } from '../index';

const PORTAL_HOSTS: ReadonlyArray<{ pattern: RegExp; portal: StudioPortal }> = [
  { pattern: /inmuebles24\.com/i, portal: 'inmuebles24' },
  { pattern: /lamudi\.com\.mx/i, portal: 'lamudi' },
  { pattern: /easybroker\.com/i, portal: 'easybroker' },
  { pattern: /vivanuncios\.com\.mx/i, portal: 'vivanuncios' },
  { pattern: /segundamano\.mx/i, portal: 'segundamano' },
  { pattern: /propiedades\.com/i, portal: 'propiedades_com' },
];

export function detectPortal(url: string): StudioPortal {
  try {
    const host = new URL(url).hostname;
    for (const { pattern, portal } of PORTAL_HOSTS) {
      if (pattern.test(host)) return portal;
    }
    return 'manual_url';
  } catch {
    return 'unknown';
  }
}

interface JsonLdRealEstate {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string | string[];
  offers?: { price?: number | string; priceCurrency?: string };
  floorSize?: { value?: number | string; unitText?: string };
  numberOfBedrooms?: number | string;
  numberOfBathroomsTotal?: number | string;
  address?: { addressLocality?: string; addressRegion?: string };
  amenityFeature?: Array<{ name?: string }>;
}

function extractJsonLdRealEstate($: cheerio.CheerioAPI): JsonLdRealEstate | null {
  const scripts = $('script[type="application/ld+json"]');
  for (const el of scripts.toArray()) {
    const raw = $(el).contents().text();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (typeof item !== 'object' || item === null) continue;
        const obj = item as JsonLdRealEstate;
        const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type'] ?? ''];
        const isRealEstate = types.some((t) =>
          /Residence|House|Apartment|Place|RealEstate|Product/i.test(String(t)),
        );
        if (isRealEstate) return obj;
      }
    } catch {
      // skip malformed json-ld
    }
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function uniqueImages(values: ReadonlyArray<string>): ReadonlyArray<string> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= 30) break;
  }
  return out;
}

export function parseGeneric(html: string): ExtractedListingData {
  const $ = cheerio.load(html);
  const ogTitle = $('meta[property="og:title"]').attr('content') ?? null;
  const ogDescription = $('meta[property="og:description"]').attr('content') ?? null;
  const ogImageList = $('meta[property="og:image"]')
    .map((_, el) => $(el).attr('content') ?? '')
    .get();
  const ogPrice =
    $('meta[property="product:price:amount"]').attr('content') ??
    $('meta[property="og:price:amount"]').attr('content') ??
    null;
  const ogCurrency =
    $('meta[property="product:price:currency"]').attr('content') ??
    $('meta[property="og:price:currency"]').attr('content') ??
    null;
  const ogLocale = $('meta[property="og:locale"]').attr('content') ?? null;

  const ld = extractJsonLdRealEstate($);
  const ldImages = ld?.image ? (Array.isArray(ld.image) ? ld.image : [ld.image]) : [];
  const photos = uniqueImages([...ogImageList, ...ldImages.map(String)]);

  const amenities =
    ld?.amenityFeature
      ?.map((a) => (typeof a?.name === 'string' ? a.name.trim() : ''))
      .filter((s) => s.length > 0)
      .slice(0, 20) ?? [];

  const titleFallback = $('h1').first().text().trim() || null;
  const descFallback = $('meta[name="description"]').attr('content') ?? null;

  return {
    title: ld?.name ?? ogTitle ?? titleFallback,
    description: ld?.description ?? ogDescription ?? descFallback,
    priceLocal: toNumber(ld?.offers?.price ?? ogPrice),
    currency: ld?.offers?.priceCurrency ?? ogCurrency ?? null,
    areaM2: toNumber(ld?.floorSize?.value ?? null),
    bedrooms: toNumber(ld?.numberOfBedrooms ?? null),
    bathrooms: toNumber(ld?.numberOfBathroomsTotal ?? null),
    zone: ld?.address?.addressLocality ?? null,
    city: ld?.address?.addressRegion ?? null,
    photos,
    amenities,
    rawMetadata: { ogLocale, jsonLdFound: ld !== null },
  };
}
