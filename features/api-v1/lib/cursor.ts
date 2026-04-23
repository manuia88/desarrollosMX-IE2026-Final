// Opaque cursor encoding for paginated REST v1 endpoints.
// Uses base64url + JSON. Defensive against malformed input — returns null.

export interface CursorPayload {
  readonly period_date: string;
  readonly id: string;
}

function toBase64Url(input: string): string {
  const b64 = Buffer.from(input, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return Buffer.from(padded + pad, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export function encodeCursor(payload: CursorPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeCursor(input: string | null | undefined): CursorPayload | null {
  if (!input) return null;
  const decoded = fromBase64Url(input);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as { period_date?: unknown }).period_date !== 'string' ||
      typeof (parsed as { id?: unknown }).id !== 'string'
    ) {
      return null;
    }
    const obj = parsed as { period_date: string; id: string };
    return { period_date: obj.period_date, id: obj.id };
  } catch {
    return null;
  }
}
