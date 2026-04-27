// F14.F.4 Sprint 3 — EasyBroker parser. Open Graph + JSON-LD primary.

import * as cheerio from 'cheerio';
import type { ExtractedListingData } from '../index';
import { parseGeneric } from './generic';

export function parseEasybroker(html: string): ExtractedListingData {
  const generic = parseGeneric(html);
  const $ = cheerio.load(html);

  const zoneText = $('[class*="location"]').first().text().trim() || null;

  return {
    ...generic,
    currency: generic.currency ?? 'MXN',
    zone: generic.zone ?? zoneText,
  };
}
