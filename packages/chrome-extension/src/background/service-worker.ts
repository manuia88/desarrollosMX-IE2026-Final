// MV3 service worker. Recibe `dmx:capture` de los content scripts y relay al endpoint DMX.
// Auth flow real (token JWT) se cablea en 7.E.3. Endpoint /api/market/capture en 7.E.4.

import { getStoredToken, incrementCaptureCount } from '../lib/auth';
import { postCapture } from '../lib/capture-client';
import { type MarketCapture, marketCaptureSchema } from '../lib/schema';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.storage.local.set({ dmx_capture_count: 0 });
  }
});

interface PingMessage {
  type: 'dmx:ping';
}

interface CaptureMessage {
  type: 'dmx:capture';
  capture: MarketCapture;
}

type RuntimeMessage = PingMessage | CaptureMessage | { type: string };

interface CaptureResponse {
  ok: boolean;
  market_price_id?: string;
  error?: string;
}

async function handleCapture(raw: unknown): Promise<CaptureResponse> {
  const parsed = marketCaptureSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_payload' };
  }
  const token = await getStoredToken();
  if (!token) {
    return { ok: false, error: 'no_auth_token' };
  }
  const result = await postCapture(parsed.data, { token });
  if (result.ok) {
    await incrementCaptureCount();
  }
  return result;
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse): boolean => {
  if (message.type === 'dmx:ping') {
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === 'dmx:capture') {
    const captureMessage = message as CaptureMessage;
    handleCapture(captureMessage.capture)
      .then((response) => sendResponse(response))
      .catch((err: unknown) => {
        const error = err instanceof Error ? err.message : String(err);
        sendResponse({ ok: false, error });
      });
    return true;
  }
  sendResponse({ ok: false, error: `unknown_message_type:${message.type}` });
  return false;
});
