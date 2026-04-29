// FASE 17 Document Intelligence — Drive API client (link público).
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3.
// Polling vía API key sola (sin OAuth). Solo carpetas marcadas "Anyone with link".

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const DEFAULT_PAGE_SIZE = 1000;

export interface DriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly modifiedTime: string;
  readonly size?: string;
}

export function parseDriveFolderId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function pollFolder(
  folderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<readonly DriveFile[]> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_DRIVE_API_KEY missing');
  }

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    key: apiKey,
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    pageSize: String(DEFAULT_PAGE_SIZE),
  });

  const res = await fetchImpl(`${DRIVE_API_BASE}?${params.toString()}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Drive API ${res.status}: ${txt}`);
  }
  const data = (await res.json()) as { files?: readonly DriveFile[] };
  return data.files ?? [];
}
