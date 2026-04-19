// Configuración del extension. API base persistido en chrome.storage para permitir
// dev (localhost:3000) o prod (desarrollosmx.com) desde el popup sin recompilar.

const API_BASE_KEY = 'dmx_api_base';
const PROD_BASE = 'https://desarrollosmx.com';
const DEV_BASE = 'http://localhost:3000';

export const API_BASE_OPTIONS = [PROD_BASE, DEV_BASE] as const;
export type ApiBase = (typeof API_BASE_OPTIONS)[number];

export function isApiBase(value: unknown): value is ApiBase {
  return typeof value === 'string' && (API_BASE_OPTIONS as readonly string[]).includes(value);
}

export async function getApiBase(): Promise<ApiBase> {
  const result = await chrome.storage.local.get(API_BASE_KEY);
  const stored = result[API_BASE_KEY];
  return isApiBase(stored) ? stored : PROD_BASE;
}

export async function setApiBase(base: ApiBase): Promise<void> {
  await chrome.storage.local.set({ [API_BASE_KEY]: base });
}

export function connectUrl(base: ApiBase): string {
  return `${base}/extension/connect`;
}
