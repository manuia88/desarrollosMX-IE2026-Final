// STUB — activar FASE 07 BLOQUE 7.E.4 con endpoint /api/market/capture firmado.
// Skeleton: contrato del cliente HTTP. La firma HMAC y el endpoint real se cablean en 7.E.4.

import type { MarketCapture } from './schema';

const DEFAULT_API_BASE = 'https://desarrollosmx.com';

export interface CaptureResponse {
  ok: boolean;
  market_price_id?: string;
  error?: string;
}

export interface PostCaptureOptions {
  apiBase?: string;
  token: string;
}

export async function postCapture(
  payload: MarketCapture,
  options: PostCaptureOptions,
): Promise<CaptureResponse> {
  const base = options.apiBase ?? DEFAULT_API_BASE;
  const res = await fetch(`${base}/api/market/capture`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  const json = (await res.json()) as { market_price_id?: string };
  return { ok: true, market_price_id: json.market_price_id ?? '' };
}
