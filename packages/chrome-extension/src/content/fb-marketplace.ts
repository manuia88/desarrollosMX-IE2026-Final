// Content script — Facebook Marketplace.
// FB es SPA con DOM dinámico React; usamos heurísticas robustas + fallback OG.
// La extracción es best-effort; FB cambia DOM frecuentemente — selectores marcados como volátiles.

import { type MarketCapture, marketCaptureSchema } from '../lib/schema';
import {
  computeRawHtmlHash,
  detectCurrency,
  detectOperation,
  detectPropertyType,
  detectSellerType,
  injectCaptureButton,
  parseInteger,
  parsePriceMx,
  readOpenGraph,
  sendCapture,
  showToast,
} from './_shared';

const PORTAL = 'fb_marketplace' as const;

function isListingPage(): boolean {
  return /\/marketplace\/item\//.test(location.pathname);
}

function extractListingId(): string {
  const match = location.pathname.match(/\/item\/(\d+)/);
  if (match?.[1]) return match[1];
  return location.pathname.split('/').filter(Boolean).pop() ?? location.pathname;
}

function findPriceText(): string {
  const og = readOpenGraph();
  if (og['og:price:amount']) return og['og:price:amount'];
  const main = document.querySelector('div[role="main"]');
  if (!main) return '';
  const candidates = main.querySelectorAll('span');
  for (const span of candidates) {
    const text = span.textContent ?? '';
    if (/\$\s*[\d.,]+/.test(text)) return text;
  }
  return '';
}

async function extract(): Promise<MarketCapture | null> {
  const og = readOpenGraph();
  const title = og['og:title'] ?? document.title ?? '';
  const listing_id = extractListingId();
  const url = location.href;

  const priceText = findPriceText();
  const price_listed = parsePriceMx(priceText);
  if (!price_listed) {
    showToast('No se pudo leer el precio del listing.', 'error');
    return null;
  }

  const currency = detectCurrency(priceText);
  const operation_type = detectOperation(`${title} ${location.pathname}`) ?? 'venta';
  const property_type = detectPropertyType(`${title} ${location.pathname}`);

  const featuresText = document.body.textContent?.slice(0, 8000) ?? '';
  const bedroomsMatch = featuresText.match(/(\d+)\s*(?:rec[áa]maras?|bedrooms?|recs?)/i);
  const bathroomsMatch = featuresText.match(/(\d+)\s*(?:ba[ñn]os?|bathrooms?)/i);
  const sqmMatch = featuresText.match(/(\d+)\s*m[²2]/i);
  const seller_type = detectSellerType(featuresText);

  const captured_at = new Date().toISOString();
  const raw_html_hash = await computeRawHtmlHash();

  const candidate: MarketCapture = {
    portal: PORTAL,
    listing_id,
    url,
    price_listed,
    currency,
    operation_type,
    property_type,
    address_raw: title.length >= 5 ? title : `Listing FB Marketplace ${listing_id}`,
    amenities: [],
    seller_type,
    raw_html_hash,
    captured_at,
    ...(sqmMatch?.[1] ? { sqm_construction: Number.parseFloat(sqmMatch[1]) } : {}),
    ...(bedroomsMatch?.[1] ? { bedrooms: parseInteger(bedroomsMatch[1]) ?? 0 } : {}),
    ...(bathroomsMatch?.[1] ? { bathrooms: Number.parseFloat(bathroomsMatch[1]) } : {}),
  };

  const parsed = marketCaptureSchema.safeParse(candidate);
  if (!parsed.success) {
    showToast('Schema de captura inválido.', 'error');
    return null;
  }
  return parsed.data;
}

async function handleClick(): Promise<void> {
  const capture = await extract();
  if (!capture) return;
  const response = await sendCapture(PORTAL, capture);
  if (response.ok) {
    showToast('Listing capturado en DMX.', 'ok');
  } else {
    showToast(`Captura falló: ${response.error ?? 'desconocido'}`, 'error');
  }
}

function bootstrap(): void {
  if (isListingPage()) injectCaptureButton(handleClick);
}

bootstrap();

let lastPath = location.pathname;
new MutationObserver(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    document.getElementById('dmx-capture-fab')?.remove();
    bootstrap();
  }
}).observe(document.body, { childList: true, subtree: true });
