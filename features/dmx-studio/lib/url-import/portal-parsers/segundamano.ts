// F14.F.4 Sprint 3 — Segundamano parser. Open Graph + body fallback.

import type { ExtractedListingData } from '../index';
import { parseGeneric } from './generic';

export function parseSegundamano(html: string): ExtractedListingData {
  const generic = parseGeneric(html);
  return {
    ...generic,
    currency: generic.currency ?? 'MXN',
  };
}
