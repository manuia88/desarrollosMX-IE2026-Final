// Auth helpers — token DMX persistido en chrome.storage.local.
// Token format: opaque string ≥ 32 chars (server-issued via /extension/connect).
// El server valida token en /api/extension/me y /api/market/capture.

import { z } from 'zod';
import { getApiBase } from './config';

const TOKEN_KEY = 'dmx_auth_token';
const USER_KEY = 'dmx_user';
const CAPTURE_COUNT_KEY = 'dmx_capture_count';

export const dmxUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
});
export type DmxUser = z.infer<typeof dmxUserSchema>;

export function isValidTokenFormat(value: string): boolean {
  return value.length >= 32 && value.length <= 512 && /^[A-Za-z0-9._-]+$/.test(value);
}

export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function setStoredToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredUser(): Promise<DmxUser | null> {
  const result = await chrome.storage.local.get(USER_KEY);
  const parsed = dmxUserSchema.safeParse(result[USER_KEY]);
  return parsed.success ? parsed.data : null;
}

export async function setStoredUser(user: DmxUser): Promise<void> {
  await chrome.storage.local.set({ [USER_KEY]: user });
}

export async function getCaptureCount(): Promise<number> {
  const result = await chrome.storage.local.get(CAPTURE_COUNT_KEY);
  const count = result[CAPTURE_COUNT_KEY];
  return typeof count === 'number' ? count : 0;
}

export async function incrementCaptureCount(): Promise<number> {
  const current = await getCaptureCount();
  const next = current + 1;
  await chrome.storage.local.set({ [CAPTURE_COUNT_KEY]: next });
  return next;
}

export interface VerifyResult {
  ok: boolean;
  user?: DmxUser;
  error?: string;
}

export async function verifyTokenAgainstApi(token: string): Promise<VerifyResult> {
  const base = await getApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}/api/extension/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: 'network_error' };
  }
  if (res.status === 401) return { ok: false, error: 'invalid_token' };
  if (!res.ok) return { ok: false, error: `http_${res.status}` };
  const json = (await res.json()) as unknown;
  const parsed = dmxUserSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: 'invalid_user_payload' };
  return { ok: true, user: parsed.data };
}

export async function login(token: string): Promise<VerifyResult> {
  if (!isValidTokenFormat(token)) {
    return { ok: false, error: 'bad_token_format' };
  }
  const verification = await verifyTokenAgainstApi(token);
  if (!verification.ok || !verification.user) return verification;
  await setStoredToken(token);
  await setStoredUser(verification.user);
  return verification;
}

export async function logout(): Promise<void> {
  await clearAuth();
}
