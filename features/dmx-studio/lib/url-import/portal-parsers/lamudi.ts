// F14.F.4 Sprint 3 — Lamudi parser. JSON-LD canon + Open Graph + body fallback.

import * as cheerio from 'cheerio';
import type { ExtractedListingData } from '../index';
import { parseGeneric } from './generic';

export function parseLamudi(html: string): ExtractedListingData {
  const generic = parseGeneric(html);
  const $ = cheerio.load(html);

  const zoneText =
    $('[data-testid="location"]').first().text().trim() ||
    $('[class*="location"]').first().text().trim() ||
    null;

  return {
    ...generic,
    currency: generic.currency ?? 'MXN',
    zone: generic.zone ?? zoneText,
  };
}
