// FASE 11.J.2 — Wrapped share image generator.
//
// H1: genera SVG 1080×1080 por card (fallback manual). PNG rasterize pending
// L-NN-PNG-RASTERIZE → FASE 22 Marketing (integración con sharp/@napi-rs/canvas
// que requieren dep nueva — espera founder approval).
//
// Swap path cuando llegue 11.U Stickers: substituir por sticker-templates
// table + renderer unificado.

import type { WrappedCard } from '../types';

export interface GenerateWrappedShareSvgOpts {
  readonly card: WrappedCard;
  readonly year: number;
  readonly countryCode: string;
}

// Escape XML special chars (svg content).
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateWrappedShareSvg(opts: GenerateWrappedShareSvgOpts): string {
  const { card, year, countryCode } = opts;
  const title = xmlEscape(card.title);
  const value = xmlEscape(card.value);
  const subtext = xmlEscape(card.subtext ?? '');
  const emoji = xmlEscape(card.emoji ?? '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <text x="60" y="120" fill="#999" font-family="Inter,sans-serif" font-size="28" font-weight="600">DMX Wrapped ${year} · ${xmlEscape(countryCode)}</text>
  <text x="540" y="380" fill="#fff" font-family="Inter,sans-serif" font-size="120" text-anchor="middle">${emoji}</text>
  <text x="540" y="520" fill="#fff" font-family="Inter,sans-serif" font-size="52" font-weight="700" text-anchor="middle">${title}</text>
  <text x="540" y="640" fill="#fff" font-family="Inter,sans-serif" font-size="84" font-weight="900" text-anchor="middle">${value}</text>
  ${
    subtext
      ? `<text x="540" y="740" fill="#aaa" font-family="Inter,sans-serif" font-size="36" text-anchor="middle">${subtext}</text>`
      : ''
  }
  <text x="540" y="1000" fill="#666" font-family="Inter,sans-serif" font-size="24" text-anchor="middle">desarrollosmx.com</text>
</svg>`;
}

// L-NN-PNG-RASTERIZE → FASE 22 Marketing:
//   Cuando founder apruebe dep (sharp o @napi-rs/canvas), agregar:
//     export async function rasterizeSvgToPng(svg: string): Promise<Buffer>
//   + upload a Supabase Storage bucket `wrapped-share` → devuelve URL.
