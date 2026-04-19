// Helpers compartidos por content scripts. Extracción best-effort siguiendo prioridad:
// JSON-LD > OpenGraph > __NEXT_DATA__ > selectores DOM específicos por portal.
//
// Los content scripts NO hacen fetch directo a /api/market/capture (CORS).
// Envían `dmx:capture` al service worker que tiene host_permissions DMX.

import type { PortalId } from '../lib/portals';
import type { MarketCapture } from '../lib/schema';

export interface ExtractionResult {
  ok: boolean;
  capture: MarketCapture | null;
  reason: string | null;
}

export interface CaptureMessage {
  type: 'dmx:capture';
  capture: MarketCapture;
}

export interface CaptureResponseMessage {
  ok: boolean;
  market_price_id?: string;
  error?: string;
}

const BUTTON_ID = 'dmx-capture-fab';

export function injectCaptureButton(onClick: () => void | Promise<void>): void {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Capturar listing en DesarrollosMX');
  btn.textContent = '📥 Capturar en DMX';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    padding: '12px 18px',
    borderRadius: '999px',
    border: '0',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '600',
    background: '#7c3aed',
    color: '#ffffff',
    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = '0 12px 32px rgba(124, 58, 237, 0.45)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.35)';
  });

  btn.addEventListener('click', () => {
    void onClick();
  });

  document.body.appendChild(btn);
}

export function showToast(message: string, kind: 'ok' | 'error' = 'ok'): void {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '88px',
    right: '24px',
    zIndex: '2147483647',
    padding: '10px 14px',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#ffffff',
    background: kind === 'ok' ? '#16a34a' : '#dc2626',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

export async function computeRawHtmlHash(): Promise<string> {
  const html = document.documentElement.outerHTML;
  const buf = new TextEncoder().encode(html);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function readJsonLd(): unknown[] {
  const nodes = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  const out: unknown[] = [];
  nodes.forEach((node) => {
    const text = node.textContent;
    if (!text) return;
    try {
      out.push(JSON.parse(text));
    } catch {
      // payload roto, ignorar
    }
  });
  return out;
}

export function readOpenGraph(): Record<string, string> {
  const out: Record<string, string> = {};
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]');
  metas.forEach((meta) => {
    const key = meta.getAttribute('property');
    const value = meta.getAttribute('content');
    if (key && value) out[key] = value;
  });
  return out;
}

export function readNextData(): unknown {
  const node = document.getElementById('__NEXT_DATA__');
  if (!node || !node.textContent) return null;
  try {
    return JSON.parse(node.textContent);
  } catch {
    return null;
  }
}

const PRICE_REGEX = /[\d.,]+/g;

export function parsePriceMx(raw: string): number | null {
  const matches = raw.match(PRICE_REGEX);
  if (!matches) return null;
  const longest = matches.reduce((acc, m) => (m.length > acc.length ? m : acc), '');
  const normalized = longest.replace(/\./g, '').replace(/,/g, '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseInteger(raw: string): number | null {
  const match = raw.match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function detectCurrency(text: string): 'MXN' | 'USD' {
  const upper = text.toUpperCase();
  if (upper.includes('USD') || upper.includes('US$') || upper.includes('DLLS')) return 'USD';
  return 'MXN';
}

export function detectOperation(text: string): 'venta' | 'renta' | null {
  const lower = text.toLowerCase();
  if (lower.includes('renta') || lower.includes('alquiler')) return 'renta';
  if (lower.includes('venta') || lower.includes('comprar')) return 'venta';
  return null;
}

export function detectPropertyType(text: string): MarketCapture['property_type'] {
  const lower = text.toLowerCase();
  if (lower.includes('departamento') || lower.includes('depa')) return 'departamento';
  if (lower.includes('casa')) return 'casa';
  if (lower.includes('terreno') || lower.includes('lote')) return 'terreno';
  if (lower.includes('local')) return 'local';
  if (lower.includes('oficina')) return 'oficina';
  return 'otro';
}

export function detectSellerType(text: string): MarketCapture['seller_type'] {
  const lower = text.toLowerCase();
  if (lower.includes('inmobiliaria') || lower.includes('agencia') || lower.includes('broker')) {
    return 'inmobiliaria';
  }
  if (lower.includes('particular') || lower.includes('dueño directo')) {
    return 'particular';
  }
  return 'desconocido';
}

export async function sendCapture(
  portal: PortalId,
  capture: MarketCapture,
): Promise<CaptureResponseMessage> {
  const message: CaptureMessage = { type: 'dmx:capture', capture };
  void portal;
  const response = (await chrome.runtime.sendMessage(message)) as
    | CaptureResponseMessage
    | undefined;
  return response ?? { ok: false, error: 'no_response' };
}
