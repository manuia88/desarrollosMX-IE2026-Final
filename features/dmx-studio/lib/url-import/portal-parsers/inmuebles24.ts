// F14.F.4 Sprint 3 — Inmuebles24 parser. Open Graph + JSON-LD primary, body fallback.

import * as cheerio from 'cheerio';
import type { ExtractedListingData } from '../index';
import { parseGeneric } from './generic';

const PRICE_REGEX = /MN\$|MXN\$|MN\s|MXN\s|\$/i;
const AREA_REGEX = /(\d+(?:[.,]\d+)?)\s*m[²2]/i;
const BEDROOMS_REGEX = /(\d+)\s+(?:rec[aá]maras?|recs|habitaciones?)/i;
const BATHROOMS_REGEX = /(\d+(?:\.\d+)?)\s+ba[ñn]os?/i;

function toNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseInmuebles24(html: string): ExtractedListingData {
  const generic = parseGeneric(html);
  const $ = cheerio.load(html);
  const bodyText = $('body').text();

  const priceText = $('[class*="price"]').first().text();
  const areaMatch = AREA_REGEX.exec(bodyText);
  const bedroomsMatch = BEDROOMS_REGEX.exec(bodyText);
  const bathroomsMatch = BATHROOMS_REGEX.exec(bodyText);
  const zoneText = $('[class*="location"]').first().text().trim() || null;

  return {
    ...generic,
    priceLocal:
      generic.priceLocal ??
      (PRICE_REGEX.test(priceText) ? toNumber(priceText) : toNumber(priceText)),
    currency: generic.currency ?? 'MXN',
    areaM2: generic.areaM2 ?? (areaMatch?.[1] ? toNumber(areaMatch[1]) : null),
    bedrooms: generic.bedrooms ?? (bedroomsMatch?.[1] ? toNumber(bedroomsMatch[1]) : null),
    bathrooms: generic.bathrooms ?? (bathroomsMatch?.[1] ? toNumber(bathroomsMatch[1]) : null),
    zone: generic.zone ?? zoneText,
  };
}
