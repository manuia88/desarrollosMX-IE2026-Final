// FASE 14.F.4 Sprint 3 — Bulk handler unit tests (submitBulkUrls + processSingleImport).
// Modo A: createCaller-style mocks. Mocks supabase admin via builder + fetchHtml dep injection.

import { describe, expect, it, vi } from 'vitest';
import {
  processSingleImport,
  submitBulkUrls,
} from '@/features/dmx-studio/lib/url-import/bulk-handler';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface MockRow {
  id: string;
  source_url: string;
  retry_count: number | null;
}

interface MockHarness {
  client: AdminClient;
  inserts: Array<{ table: string; payload: unknown }>;
  updates: Array<{ table: string; id: string; payload: unknown }>;
}

function buildMockClient(
  opts: { rows?: ReadonlyArray<MockRow>; insertIds?: string[] } = {},
): MockHarness {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; id: string; payload: unknown }> = [];
  const rows = opts.rows ?? [];
  const insertIds = opts.insertIds ?? ['imp_1', 'imp_2', 'imp_3'];
  let idCounter = 0;

  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          inserts.push({ table, payload });
          return {
            select(_cols?: string) {
              return Promise.resolve({
                data: Array.isArray(payload)
                  ? payload.map(() => ({ id: insertIds[idCounter++] ?? `imp_${idCounter}` }))
                  : [{ id: insertIds[idCounter++] ?? 'imp_x' }],
                error: null,
              });
            },
          };
        },
        update(payload: unknown) {
          return {
            eq(_col: string, id: string) {
              updates.push({ table, id, payload });
              return Promise.resolve({ error: null });
            },
          };
        },
        select(_cols: string) {
          return {
            eq(_col: string, value: string) {
              return {
                async maybeSingle() {
                  const row = rows.find((r) => r.id === value);
                  return { data: row ?? null, error: null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as AdminClient;

  return { client, inserts, updates };
}

describe('submitBulkUrls', () => {
  it('throws when urls array is empty', async () => {
    const mock = buildMockClient();
    await expect(submitBulkUrls(mock.client, 'user_1', [])).rejects.toThrow(/between 1 and 10/);
  });

  it('throws when urls array exceeds 10 items', async () => {
    const mock = buildMockClient();
    const tooMany = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`);
    await expect(submitBulkUrls(mock.client, 'user_1', tooMany)).rejects.toThrow(
      /between 1 and 10/,
    );
  });

  it('inserts rows with bulk_batch_id + returns batchId + importIds for valid input', async () => {
    const mock = buildMockClient({ insertIds: ['imp_a', 'imp_b'] });
    const result = await submitBulkUrls(mock.client, 'user_1', [
      'https://www.inmuebles24.com/casa/1',
      'https://www.lamudi.com.mx/dept/2',
    ]);
    expect(result.batchId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.importIds).toEqual(['imp_a', 'imp_b']);
    expect(mock.inserts).toHaveLength(1);
    const payload = mock.inserts[0]?.payload as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(2);
    expect(payload[0]?.bulk_batch_id).toBe(result.batchId);
    expect(payload[0]?.source_portal).toBe('inmuebles24');
    expect(payload[1]?.source_portal).toBe('lamudi');
    expect(payload[0]?.scrape_status).toBe('pending');
  });
});

describe('processSingleImport', () => {
  it('updates row to completed with extracted data when fetch succeeds', async () => {
    const mock = buildMockClient({
      rows: [{ id: 'imp_a', source_url: 'https://www.inmuebles24.com/casa/1', retry_count: 0 }],
    });
    const fetchHtml = vi.fn().mockResolvedValue(`
      <html>
        <head>
          <meta property="og:title" content="Casa Roma" />
          <meta property="og:image" content="https://x.com/p1.jpg" />
          <meta property="product:price:amount" content="8500000" />
          <meta property="product:price:currency" content="MXN" />
        </head>
        <body>
          <div>3 recamaras 180 m2 2 baños</div>
        </body>
      </html>
    `);
    await processSingleImport(mock.client, 'imp_a', { fetchHtml });
    expect(fetchHtml).toHaveBeenCalledWith('https://www.inmuebles24.com/casa/1');
    const completedUpdates = mock.updates.filter(
      (u) => (u.payload as Record<string, unknown>).scrape_status === 'completed',
    );
    expect(completedUpdates).toHaveLength(1);
    const payload = completedUpdates[0]?.payload as Record<string, unknown>;
    expect(payload.price_extracted).toBe(8500000);
    expect(payload.bedrooms_extracted).toBe(3);
    expect(payload.area_extracted).toBe(180);
    expect(payload.photos_extracted).toBeGreaterThanOrEqual(1);
  });

  it('updates row with status=failed and increments retry_count when fetch throws', async () => {
    const mock = buildMockClient({
      rows: [{ id: 'imp_b', source_url: 'https://www.inmuebles24.com/casa/2', retry_count: 1 }],
    });
    const fetchHtml = vi.fn().mockRejectedValue(new Error('network refused'));
    await processSingleImport(mock.client, 'imp_b', { fetchHtml });
    const failedUpdates = mock.updates.filter(
      (u) => (u.payload as Record<string, unknown>).scrape_status === 'failed',
    );
    expect(failedUpdates).toHaveLength(1);
    const payload = failedUpdates[0]?.payload as Record<string, unknown>;
    expect(payload.error_message).toContain('network refused');
    expect(payload.retry_count).toBe(2);
  });

  it('marks row as blocked when error message matches 403/captcha/cloudflare pattern', async () => {
    const mock = buildMockClient({
      rows: [{ id: 'imp_c', source_url: 'https://www.lamudi.com.mx/x', retry_count: 0 }],
    });
    const fetchHtml = vi.fn().mockRejectedValue(new Error('fetch failed 403 Forbidden'));
    await processSingleImport(mock.client, 'imp_c', { fetchHtml });
    const blockedUpdates = mock.updates.filter(
      (u) => (u.payload as Record<string, unknown>).scrape_status === 'blocked',
    );
    expect(blockedUpdates).toHaveLength(1);
  });

  it('returns silently when row not found (no updates)', async () => {
    const mock = buildMockClient({ rows: [] });
    await processSingleImport(mock.client, 'nonexistent_id');
    expect(mock.updates).toHaveLength(0);
  });
});
