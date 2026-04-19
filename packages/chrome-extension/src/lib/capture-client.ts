// Cliente HTTP para POST /api/market/capture. La firma HMAC server-side
// (rate limit 500/h/user) se valida en el endpoint creado en 7.E.4.

import { getApiBase } from './config';
import type { MarketCapture } from './schema';

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
  const base = options.apiBase ?? (await getApiBase());
  let res: Response;
  try {
    res = await fetch(`${base}/api/market/capture`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: 'network_error' };
  }

  if (res.status === 401) return { ok: false, error: 'unauthorized' };
  if (res.status === 429) return { ok: false, error: 'rate_limited' };
  if (!res.ok) return { ok: false, error: `http_${res.status}` };

  const json = (await res.json()) as { market_price_id?: string };
  return { ok: true, market_price_id: json.market_price_id ?? '' };
}
