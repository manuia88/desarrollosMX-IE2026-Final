// F14.F.4 Sprint 3 — URL paste 1-by-1 user-initiated extraction.
//
// Server-side fetch a URL específica = 1 request indistinguible de Google bot
// legítimo. Open Graph + JSON-LD schema.org + HTML body fallback per portal.
// NO scraping bulk Apify-style (eso falla por bot detection canon founder).

import type { StudioPortal } from '@/features/dmx-studio/schemas';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { parseEasybroker } from './portal-parsers/easybroker';
import { detectPortal, parseGeneric } from './portal-parsers/generic';
import { parseInmuebles24 } from './portal-parsers/inmuebles24';
import { parseLamudi } from './portal-parsers/lamudi';
import { parseSegundamano } from './portal-parsers/segundamano';
import { parseVivanuncios } from './portal-parsers/vivanuncios';

export interface ExtractedListingData {
  readonly title: string | null;
  readonly description: string | null;
  readonly priceLocal: number | null;
  readonly currency: string | null;
  readonly areaM2: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly zone: string | null;
  readonly city: string | null;
  readonly photos: ReadonlyArray<string>;
  readonly amenities: ReadonlyArray<string>;
  readonly rawMetadata: Record<string, unknown>;
}

export interface ParseListingResult {
  readonly portal: StudioPortal;
  readonly status: 'completed' | 'failed' | 'blocked';
  readonly data: ExtractedListingData | null;
  readonly errorMessage: string | null;
}

export type FetchHtmlFn = (url: string) => Promise<string>;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function defaultFetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`url-import: fetch failed ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function parseListingUrl(
  url: string,
  fetchHtml: FetchHtmlFn = defaultFetchHtml,
): Promise<ParseListingResult> {
  const portal = detectPortal(url);
  try {
    const html = await fetchHtml(url);
    let data: ExtractedListingData;
    switch (portal) {
      case 'inmuebles24':
        data = parseInmuebles24(html);
        break;
      case 'lamudi':
        data = parseLamudi(html);
        break;
      case 'easybroker':
        data = parseEasybroker(html);
        break;
      case 'vivanuncios':
        data = parseVivanuncios(html);
        break;
      case 'segundamano':
        data = parseSegundamano(html);
        break;
      default:
        data = parseGeneric(html);
        break;
    }
    return { portal, status: 'completed', data, errorMessage: null };
  } catch (error) {
    sentry.captureException(error, { tags: { feature: 'studio-url-import', portal } });
    const message = error instanceof Error ? error.message : 'unknown';
    const isBlocked = /403|429|captcha|cloudflare/i.test(message);
    return {
      portal,
      status: isBlocked ? 'blocked' : 'failed',
      data: null,
      errorMessage: message,
    };
  }
}
