// Content script — Inmuebles24 (Adevinta).
// Detección listing: pathname contiene `/propiedades/` o `/-id-` segment.
// Estrategia extracción: __NEXT_DATA__ → JSON-LD → meta og.

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
  readJsonLd,
  readNextData,
  readOpenGraph,
  sendCapture,
  showToast,
} from './_shared';

const PORTAL = 'inmuebles24' as const;

function isListingPage(): boolean {
  const path = location.pathname;
  return /\/propiedades\//.test(path) || /-id-\d+/.test(path);
}

function extractListingId(): string {
  const match = location.pathname.match(/-id-(\d+)/);
  if (match?.[1]) return match[1];
  const og = readOpenGraph();
  if (og['og:url']) {
    const subMatch = og['og:url'].match(/-id-(\d+)/);
    if (subMatch?.[1]) return subMatch[1];
  }
  return location.pathname.split('/').filter(Boolean).pop() ?? location.pathname;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function findLdProduct(): Record<string, unknown> | null {
  const items = readJsonLd();
  for (const item of items) {
    const record = asRecord(item);
    if (!record) continue;
    const type = record['@type'];
    if (type === 'Product' || type === 'Residence' || type === 'House' || type === 'Apartment') {
      return record;
    }
  }
  return null;
}

async function extract(): Promise<MarketCapture | null> {
  const og = readOpenGraph();
  const ld = findLdProduct();
  const next = asRecord(readNextData());

  const title =
    og['og:title'] ?? document.title ?? (ld?.name as string | undefined) ?? 'sin titulo';
  const url = location.href;
  const listing_id = extractListingId();

  const rawPrice =
    (asRecord(ld?.offers)?.price as string | number | undefined) ??
    document.querySelector<HTMLElement>('[data-qa="POSTING_CARD_PRICE"]')?.textContent ??
    document.querySelector<HTMLElement>('[class*="price"]')?.textContent ??
    '';
  const priceText = String(rawPrice);
  const price_listed = parsePriceMx(priceText);
  if (!price_listed) {
    showToast('No se pudo leer el precio del listing.', 'error');
    return null;
  }

  const currency = detectCurrency(priceText);
  const operation_type = detectOperation(`${title} ${location.pathname}`) ?? 'venta';
  const property_type = detectPropertyType(`${title} ${location.pathname}`);

  const addressNode =
    document.querySelector<HTMLElement>('h2.title-location') ??
    document.querySelector<HTMLElement>('[data-qa="POSTING_CARD_LOCATION"]');
  const address_raw = (addressNode?.textContent ?? og['og:locality'] ?? title).trim();

  const featuresText = document.body.textContent ?? '';
  const bedroomsMatch = featuresText.match(/(\d+)\s*(?:rec[áa]maras?|recs?|hab\b)/i);
  const bathroomsMatch = featuresText.match(/(\d+)\s*ba[ñn]os?/i);
  const sqmMatch = featuresText.match(/(\d+)\s*m[²2]\s*(?:de\s*construcci[oó]n|construidos)?/i);

  const seller_type = detectSellerType(featuresText.slice(0, 4000));
  const captured_at = new Date().toISOString();
  const raw_html_hash = await computeRawHtmlHash();
  const next_payload_present = next !== null;

  const candidate: MarketCapture = {
    portal: PORTAL,
    listing_id,
    url,
    price_listed,
    currency,
    operation_type,
    property_type,
    address_raw: address_raw.length >= 5 ? address_raw : `Listing Inmuebles24 ${listing_id}`,
    amenities: [],
    seller_type,
    raw_html_hash,
    captured_at,
    ...(sqmMatch?.[1] ? { sqm_construction: Number.parseFloat(sqmMatch[1]) } : {}),
    ...(bedroomsMatch?.[1] ? { bedrooms: parseInteger(bedroomsMatch[1]) ?? 0 } : {}),
    ...(bathroomsMatch?.[1] ? { bathrooms: Number.parseFloat(bathroomsMatch[1]) } : {}),
  };

  void next_payload_present;
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

if (isListingPage()) {
  injectCaptureButton(handleClick);
}
