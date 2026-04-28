// Content script — Mercado Libre Inmuebles MX.
// Detección listing: pathname empieza con `/MLM-` o contiene `/p/`.

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
  readOpenGraph,
  sendCapture,
  showToast,
} from './_shared';

const PORTAL = 'ml_inmuebles' as const;

function isListingPage(): boolean {
  return /\/MLM-?\d+/i.test(location.pathname) || /\/inmueble\//.test(location.pathname);
}

function extractListingId(): string {
  const match = location.pathname.match(/MLM-?(\d+)/i);
  if (match?.[1]) return `MLM${match[1]}`;
  return location.pathname.split('/').filter(Boolean).pop() ?? location.pathname;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function findLdProduct(): Record<string, unknown> | null {
  for (const item of readJsonLd()) {
    const record = asRecord(item);
    if (!record) continue;
    const type = record['@type'];
    if (type === 'Product' || type === 'Residence') return record;
  }
  return null;
}

async function extract(): Promise<MarketCapture | null> {
  const og = readOpenGraph();
  const ld = findLdProduct();

  const title = og['og:title'] ?? document.title ?? (ld?.name as string | undefined) ?? '';
  const listing_id = extractListingId();
  const url = location.href;

  const rawPrice =
    (asRecord(ld?.offers)?.price as string | number | undefined) ??
    document.querySelector<HTMLElement>('.andes-money-amount__fraction')?.textContent ??
    document.querySelector<HTMLElement>('[class*="price"]')?.textContent ??
    '';
  const priceText = String(rawPrice);
  const price_listed = parsePriceMx(priceText);
  if (!price_listed) {
    showToast('No se pudo leer el precio.', 'error');
    return null;
  }

  const currency = detectCurrency(priceText);
  const operation_type = detectOperation(`${title} ${location.pathname}`) ?? 'venta';
  const property_type = detectPropertyType(`${title} ${location.pathname}`);

  const addressNode =
    document.querySelector<HTMLElement>('.ui-pdp-media__title') ??
    document.querySelector<HTMLElement>('[class*="location"]');
  const address_raw = (addressNode?.textContent ?? title).trim();

  const featuresText = document.body.textContent ?? '';
  const bedroomsMatch = featuresText.match(/(\d+)\s*(?:rec[áa]maras?|recs?|hab\b)/i);
  const bathroomsMatch = featuresText.match(/(\d+)\s*ba[ñn]os?/i);
  const sqmMatch = featuresText.match(/(\d+)\s*m[²2]\s*(?:de\s*construcci[oó]n|construidos)?/i);
  const seller_type = detectSellerType(featuresText.slice(0, 4000));

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
    address_raw: address_raw.length >= 5 ? address_raw : `Listing ML Inmuebles ${listing_id}`,
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

if (isListingPage()) {
  injectCaptureButton(handleClick);
}
