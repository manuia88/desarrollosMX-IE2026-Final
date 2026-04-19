import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock supabase admin client ANTES de importar auto-fetcher (leer/escribir
// watermark state). State in-memory replica tabla ingest_watermarks.
interface WatermarkRow {
  source: string;
  country_code: string;
  meta: Record<string, unknown>;
}

const watermarkStore = new Map<string, WatermarkRow>();

vi.mock('@/shared/lib/supabase/admin', () => {
  function builderFor(table: string) {
    if (table !== 'ingest_watermarks') {
      throw new Error(`unexpected table ${table}`);
    }
    let currentSource: string | null = null;
    const builder = {
      select(_cols: string) {
        return builder;
      },
      eq(col: string, val: string) {
        if (col === 'source') currentSource = val;
        return builder;
      },
      async maybeSingle() {
        if (!currentSource) return { data: null };
        const row = watermarkStore.get(currentSource);
        return { data: row ?? null };
      },
      async upsert(payload: WatermarkRow, _opts: unknown) {
        watermarkStore.set(payload.source, payload);
        return { error: null };
      },
    };
    return builder;
  }
  return {
    createAdminClient: () => ({
      from: (table: string) => builderFor(table),
      storage: { from: () => ({}) },
    }),
  };
});

// Mock ingestors (macro) para evitar side effects de runIngest real.
vi.mock('@/shared/lib/ingest/macro/bbva-research', () => ({
  ingestBbvaPdf: vi.fn(async () => ({
    rows_inserted: 3,
    rows_updated: 0,
    rows_skipped: 0,
    rows_dlq: 0,
    errors: [],
  })),
}));

import type { AutoFetchConfig, StorageUploader } from '../auto-fetcher';
import { runAutoFetch } from '../auto-fetcher';
import { BBVA_RESEARCH_CONFIG, regexDiscoverer } from '../sources';

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function okResponse(body: string | Buffer, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (k: string) => headers[k.toLowerCase()] ?? null,
    },
    async text() {
      return typeof body === 'string' ? body : body.toString('utf8');
    },
    async arrayBuffer() {
      if (typeof body === 'string') return new TextEncoder().encode(body).buffer;
      return toArrayBuffer(body);
    },
  } as unknown as Response;
}

beforeEach(() => {
  watermarkStore.clear();
  vi.clearAllMocks();
});

const mockUploader: StorageUploader = async () => ({ error: null });

describe('regexDiscoverer', () => {
  it('extrae link PDF del HTML y lo resuelve como URL absoluta', async () => {
    const discover = regexDiscoverer(/href="([^"]+\.pdf)"/i);
    const html = '<a href="/files/situacion-2026-03.pdf">Download</a>';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(html))
      .mockResolvedValueOnce(okResponse('', { etag: '"abc123"' }));
    const result = await discover('https://example.com/reports/', {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result).not.toBeNull();
    expect(result?.fileUrl).toBe('https://example.com/files/situacion-2026-03.pdf');
    expect(result?.etag).toBe('"abc123"');
  });

  it('devuelve null si no hay match', async () => {
    const discover = regexDiscoverer(/href="([^"]+\.pdf)"/i);
    const html = '<a href="/nothing.html">nope</a>';
    const fetchMock = vi.fn().mockResolvedValue(okResponse(html));
    const result = await discover('https://example.com/', {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it('lanza error si discovery HTTP falla', async () => {
    const discover = regexDiscoverer(/href="([^"]+\.pdf)"/i);
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      discover('https://example.com/', { fetchImpl: fetchMock as unknown as typeof fetch }),
    ).rejects.toThrow('discovery_http_503');
  });
});

describe('runAutoFetch — state machine', () => {
  const fakeConfig: AutoFetchConfig = {
    source: 'test_source',
    countryCode: 'MX',
    discoveryUrl: 'https://example.com/reports/',
    contentType: 'application/pdf',
    discover: vi.fn(),
    ingestBuffer: vi.fn(async () => ({
      rows_inserted: 5,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors: [],
    })),
  };

  it('descarga + ingiere cuando no hay state previo', async () => {
    const fileBuf = Buffer.from('PDF_CONTENT_V1');
    (fakeConfig.discover as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      fileUrl: 'https://example.com/file.pdf',
      etag: '"v1"',
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(fileBuf));

    const result = await runAutoFetch(fakeConfig, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      storageUploader: mockUploader,
    });

    expect(result.status).toBe('ingested');
    expect(result.sha256).toBe(sha256(fileBuf));
    expect(result.etag).toBe('"v1"');
    expect(fakeConfig.ingestBuffer).toHaveBeenCalledTimes(1);
    expect(watermarkStore.get('test_source')?.meta.autofetch_sha256).toBe(sha256(fileBuf));
  });

  it('skip con etag_match sin descargar archivo', async () => {
    watermarkStore.set('test_source', {
      source: 'test_source',
      country_code: 'MX',
      meta: { autofetch_etag: '"v1"', autofetch_sha256: 'old' },
    });
    (fakeConfig.discover as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      fileUrl: 'https://example.com/file.pdf',
      etag: '"v1"',
    });
    const fetchMock = vi.fn();

    const result = await runAutoFetch(fakeConfig, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      storageUploader: mockUploader,
    });

    expect(result.status).toBe('unchanged');
    expect(result.reason).toBe('etag_match');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fakeConfig.ingestBuffer).not.toHaveBeenCalled();
  });

  it('skip con sha256_match si etag no coincide pero contenido igual', async () => {
    const fileBuf = Buffer.from('PDF_SAME_CONTENT');
    const hash = sha256(fileBuf);
    watermarkStore.set('test_source', {
      source: 'test_source',
      country_code: 'MX',
      meta: { autofetch_etag: '"old"', autofetch_sha256: hash },
    });
    (fakeConfig.discover as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      fileUrl: 'https://example.com/file.pdf',
      etag: '"new"',
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(fileBuf));

    const result = await runAutoFetch(fakeConfig, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      storageUploader: mockUploader,
    });

    expect(result.status).toBe('unchanged');
    expect(result.reason).toBe('sha256_match');
    expect(fakeConfig.ingestBuffer).not.toHaveBeenCalled();
  });

  it('discovery_failed si config.discover lanza', async () => {
    (fakeConfig.discover as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('discovery_http_503'),
    );
    const fetchMock = vi.fn();
    const result = await runAutoFetch(fakeConfig, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      storageUploader: mockUploader,
    });
    expect(result.status).toBe('discovery_failed');
    expect(result.reason).toBe('discovery_http_503');
  });

  it('discovery_failed con no_file_link_found si discover devuelve null', async () => {
    (fakeConfig.discover as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const fetchMock = vi.fn();
    const result = await runAutoFetch(fakeConfig, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      storageUploader: mockUploader,
    });
    expect(result.status).toBe('discovery_failed');
    expect(result.reason).toBe('no_file_link_found');
  });
});

describe('AUTOFETCH_CONFIGS integrity', () => {
  it('BBVA config apunta a ingestBbvaPdf via ingestBuffer', async () => {
    expect(BBVA_RESEARCH_CONFIG.source).toBe('bbva_research');
    expect(BBVA_RESEARCH_CONFIG.countryCode).toBe('MX');
    const result = await BBVA_RESEARCH_CONFIG.ingestBuffer(Buffer.from('x'), 'test');
    expect(result.rows_inserted).toBe(3);
  });

  it('todas las sources autofetchables están listadas', async () => {
    const { AUTOFETCH_SOURCES, isAutoFetchSource } = await import('../sources');
    expect(AUTOFETCH_SOURCES.length).toBe(5);
    for (const s of AUTOFETCH_SOURCES) {
      expect(isAutoFetchSource(s)).toBe(true);
    }
    expect(isAutoFetchSource('habi')).toBe(false);
  });
});
