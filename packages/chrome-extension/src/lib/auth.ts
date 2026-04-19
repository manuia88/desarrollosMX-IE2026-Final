// STUB — activar FASE 07 BLOQUE 7.E.3 con DMX JWT auth flow.
// Skeleton: storage helpers que el popup y el service worker compartirán.

const TOKEN_KEY = 'dmx_auth_token';
const USER_KEY = 'dmx_user';
const CAPTURE_COUNT_KEY = 'dmx_capture_count';

export interface DmxUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  const token = result[TOKEN_KEY];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

export async function setStoredToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

export async function clearStoredToken(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredUser(): Promise<DmxUser | null> {
  const result = await chrome.storage.local.get(USER_KEY);
  const user = result[USER_KEY];
  if (!user || typeof user !== 'object') return null;
  return user as DmxUser;
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
