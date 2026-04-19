import { createHash } from 'node:crypto';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { IngestResult } from '../types';

// Auto-fetch wrapper: descubre URL de archivo más reciente en el portal del
// publisher, compara ETag/SHA-256 vs última ejecución exitosa, y si hay
// cambio descarga + sube a Supabase Storage + dispatcha al ingestor existente.
//
// Admin upload UI (/admin/ingest/upload) permanece como fallback plan B si
// el portal cambia estructura o bloquea fetch server-side.
//
// Playwright-extra está instalado como devDep para escenarios JS-heavy o
// anti-bot que fetch() no resuelve. Inyectable vía config.browserFetcher.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.M
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md

export interface AutoFetchState {
  etag: string | null;
  sha256: string | null;
  sourceUrl: string | null;
  lastCheckedAt: string | null;
}

export interface DiscoveryResult {
  fileUrl: string;
  etag?: string;
  meta?: Record<string, unknown>;
}

export interface AutoFetchConfig {
  source: string;
  countryCode: string;
  discoveryUrl: string;
  contentType: string;
  discover: (discoveryUrl: string, deps: DiscoveryDeps) => Promise<DiscoveryResult | null>;
  ingestBuffer: (buffer: Buffer, triggeredBy: string) => Promise<IngestResult>;
  storageBucket?: string;
  storagePathPrefix?: string;
}

export interface DiscoveryDeps {
  fetchImpl: typeof fetch;
}

export interface AutoFetchResult {
  source: string;
  status: 'ingested' | 'unchanged' | 'discovery_failed';
  reason?: string;
  etag?: string | null;
  sha256?: string | null;
  fileUrl?: string | null;
  storagePath?: string | null;
  ingest?: IngestResult;
}

export interface RunAutoFetchOptions {
  fetchImpl?: typeof fetch;
  storageUploader?: StorageUploader;
  now?: () => Date;
}

export type StorageUploader = (args: {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
}) => Promise<{ error?: { message: string } | null }>;

const BUCKET_DEFAULT = 'ingest-uploads';
const PATH_PREFIX_DEFAULT = 'autofetch';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export async function getAutoFetchState(source: string): Promise<AutoFetchState> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('ingest_watermarks')
    .select('meta')
    .eq('source', source)
    .maybeSingle();
  const meta = ((data?.meta ?? {}) as Record<string, unknown>) || {};
  return {
    etag: (meta.autofetch_etag as string | null | undefined) ?? null,
    sha256: (meta.autofetch_sha256 as string | null | undefined) ?? null,
    sourceUrl: (meta.autofetch_source_url as string | null | undefined) ?? null,
    lastCheckedAt: (meta.autofetch_last_checked_at as string | null | undefined) ?? null,
  };
}

export async function bumpAutoFetchState(
  source: string,
  countryCode: string,
  patch: Partial<AutoFetchState>,
): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('ingest_watermarks')
    .select('meta')
    .eq('source', source)
    .maybeSingle();
  const prev = ((existing?.meta ?? {}) as Record<string, unknown>) || {};
  const next: Record<string, unknown> = { ...prev };
  if (patch.etag !== undefined) next.autofetch_etag = patch.etag;
  if (patch.sha256 !== undefined) next.autofetch_sha256 = patch.sha256;
  if (patch.sourceUrl !== undefined) next.autofetch_source_url = patch.sourceUrl;
  if (patch.lastCheckedAt !== undefined) next.autofetch_last_checked_at = patch.lastCheckedAt;
  await supabase.from('ingest_watermarks').upsert(
    {
      source,
      country_code: countryCode,
      meta: next as never,
    },
    { onConflict: 'source' },
  );
}

async function defaultStorageUploader(args: {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(args.bucket).upload(args.path, args.buffer, {
    contentType: args.contentType,
    upsert: true,
  });
  return { error };
}

export async function runAutoFetch(
  config: AutoFetchConfig,
  options: RunAutoFetchOptions = {},
): Promise<AutoFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const uploader = options.storageUploader ?? defaultStorageUploader;

  const state = await getAutoFetchState(config.source);

  let discovered: DiscoveryResult | null;
  try {
    discovered = await config.discover(config.discoveryUrl, { fetchImpl });
  } catch (err) {
    await bumpAutoFetchState(config.source, config.countryCode, {
      lastCheckedAt: now().toISOString(),
    });
    return {
      source: config.source,
      status: 'discovery_failed',
      reason: err instanceof Error ? err.message : 'discovery_error',
    };
  }

  if (!discovered) {
    await bumpAutoFetchState(config.source, config.countryCode, {
      lastCheckedAt: now().toISOString(),
    });
    return {
      source: config.source,
      status: 'discovery_failed',
      reason: 'no_file_link_found',
    };
  }

  if (state.etag && discovered.etag && state.etag === discovered.etag) {
    await bumpAutoFetchState(config.source, config.countryCode, {
      lastCheckedAt: now().toISOString(),
    });
    return {
      source: config.source,
      status: 'unchanged',
      reason: 'etag_match',
      etag: discovered.etag,
      fileUrl: discovered.fileUrl,
    };
  }

  const res = await fetchImpl(discovered.fileUrl);
  if (!res.ok) {
    return {
      source: config.source,
      status: 'discovery_failed',
      reason: `file_download_http_${res.status}`,
      fileUrl: discovered.fileUrl,
    };
  }
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const sha256 = sha256Hex(buffer);

  if (state.sha256 && state.sha256 === sha256) {
    await bumpAutoFetchState(config.source, config.countryCode, {
      etag: discovered.etag ?? null,
      lastCheckedAt: now().toISOString(),
    });
    return {
      source: config.source,
      status: 'unchanged',
      reason: 'sha256_match',
      sha256,
      etag: discovered.etag ?? null,
      fileUrl: discovered.fileUrl,
    };
  }

  const bucket = config.storageBucket ?? BUCKET_DEFAULT;
  const prefix = config.storagePathPrefix ?? PATH_PREFIX_DEFAULT;
  const ts = now().toISOString().replace(/[:.]/g, '-');
  const storagePath = `${prefix}/${config.source}/${ts}-${sha256.slice(0, 12)}`;

  const uploadRes = await uploader({
    bucket,
    path: storagePath,
    buffer,
    contentType: config.contentType,
  });
  if (uploadRes.error) {
    return {
      source: config.source,
      status: 'discovery_failed',
      reason: `storage_upload_failed: ${uploadRes.error.message}`,
      fileUrl: discovered.fileUrl,
      sha256,
    };
  }

  const triggeredBy = `cron:autofetch:${config.source}`;
  const ingest = await config.ingestBuffer(buffer, triggeredBy);

  await bumpAutoFetchState(config.source, config.countryCode, {
    etag: discovered.etag ?? null,
    sha256,
    sourceUrl: discovered.fileUrl,
    lastCheckedAt: now().toISOString(),
  });

  return {
    source: config.source,
    status: 'ingested',
    etag: discovered.etag ?? null,
    sha256,
    fileUrl: discovered.fileUrl,
    storagePath,
    ingest,
  };
}
