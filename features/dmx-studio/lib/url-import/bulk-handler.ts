// F14.F.4 Sprint 3 — Bulk URL paste 1-10 URLs simultáneas (UPGRADE 1).
// User-initiated (NOT scraping bulk Apify-style). Async worker per URL.

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database, Json } from '@/shared/types/database';
import { type FetchHtmlFn, parseListingUrl } from './index';
import { detectPortal } from './portal-parsers/generic';

export interface BulkSubmitResult {
  readonly batchId: string;
  readonly importIds: ReadonlyArray<string>;
}

export interface BulkProcessOptions {
  readonly fetchHtml?: FetchHtmlFn;
  readonly maxRetries?: number;
}

export async function submitBulkUrls(
  supabase: SupabaseClient<Database>,
  userId: string,
  urls: ReadonlyArray<string>,
): Promise<BulkSubmitResult> {
  if (urls.length < 1 || urls.length > 10) {
    throw new Error('bulk: urls.length must be between 1 and 10');
  }
  const batchId = randomUUID();
  const rows = urls.map((url) => ({
    user_id: userId,
    source_portal: detectPortal(url),
    source_url: url,
    scrape_status: 'pending' as const,
    scraped_data: {} as Json,
    is_stub: false,
    bulk_batch_id: batchId,
  }));
  const { data, error } = await supabase.from('studio_portal_imports').insert(rows).select('id');
  if (error) {
    sentry.captureException(error, { tags: { feature: 'studio-bulk-urls' } });
    throw error;
  }
  const importIds = (data ?? []).map((r) => r.id);
  return { batchId, importIds };
}

export async function processSingleImport(
  supabase: SupabaseClient<Database>,
  importId: string,
  options: BulkProcessOptions = {},
): Promise<void> {
  const { data: row, error } = await supabase
    .from('studio_portal_imports')
    .select('id, source_url, retry_count')
    .eq('id', importId)
    .maybeSingle();
  if (error || !row) return;
  await supabase
    .from('studio_portal_imports')
    .update({ scrape_status: 'scraping' })
    .eq('id', importId);

  const fetchHtml = options.fetchHtml;
  const result = fetchHtml
    ? await parseListingUrl(row.source_url, fetchHtml)
    : await parseListingUrl(row.source_url);

  if (result.status === 'completed' && result.data) {
    const photos = result.data.photos.length;
    await supabase
      .from('studio_portal_imports')
      .update({
        scrape_status: 'completed',
        source_portal: result.portal,
        scraped_data: result.data as unknown as Json,
        photos_extracted: photos,
        price_extracted: result.data.priceLocal,
        area_extracted: result.data.areaM2,
        bedrooms_extracted: result.data.bedrooms,
        zone_extracted: result.data.zone,
      })
      .eq('id', importId);
    return;
  }

  await supabase
    .from('studio_portal_imports')
    .update({
      scrape_status: result.status,
      error_message: result.errorMessage,
      retry_count: (row.retry_count ?? 0) + 1,
    })
    .eq('id', importId);
}
