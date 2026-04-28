// F14.F.10 Sprint 9 SUB-AGENT 3 — bulk createBulkBatch tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { BULK_BATCH_LIMITS, createBulkBatch } from '../index';

type StudioAdminClient = SupabaseClient<Database>;

interface MockOpts {
  readonly photographerRow?: { id: string } | null;
  readonly photographerError?: Error | null;
  readonly insertError?: Error | null;
  readonly insertedRows?: ReadonlyArray<{ id: string; project_id: string; status: string }>;
  readonly captureInsert?: (rows: ReadonlyArray<unknown>) => void;
}

function buildClient(opts: MockOpts): StudioAdminClient {
  const fromImpl = vi.fn((table: string) => {
    if (table === 'studio_photographers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.photographerRow ?? null,
              error: opts.photographerError ?? null,
            }),
          }),
        }),
      };
    }
    if (table === 'studio_api_jobs') {
      return {
        insert: (rows: ReadonlyArray<unknown>) => {
          if (opts.captureInsert) opts.captureInsert(rows);
          return {
            select: () =>
              Promise.resolve({
                data: opts.insertError ? null : (opts.insertedRows ?? []),
                error: opts.insertError ?? null,
              }),
          };
        },
      };
    }
    return {};
  });
  return { from: fromImpl } as unknown as StudioAdminClient;
}

describe('photographer/bulk/createBulkBatch', () => {
  it('rechaza count < 2 con BAD_REQUEST', async () => {
    const supabase = buildClient({ photographerRow: { id: 'p-1' } });
    await expect(
      createBulkBatch(supabase, {
        photographerUserId: 'u-1',
        projectIds: ['11111111-1111-1111-1111-111111111111'],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(BULK_BATCH_LIMITS.MIN).toBe(2);
    expect(BULK_BATCH_LIMITS.MAX).toBe(20);
  });

  it('rechaza count > 20 con BAD_REQUEST', async () => {
    const supabase = buildClient({ photographerRow: { id: 'p-1' } });
    const ids = Array.from({ length: 21 }, () => crypto.randomUUID());
    await expect(
      createBulkBatch(supabase, { photographerUserId: 'u-1', projectIds: ids }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it('genera batchId UUID y comparte en payload de cada job', async () => {
    let captured: ReadonlyArray<unknown> = [];
    const supabase = buildClient({
      photographerRow: { id: 'p-42' },
      insertedRows: Array.from({ length: 3 }, (_, i) => ({
        id: `j-${i}`,
        project_id: `pj-${i}`,
        status: 'queued',
      })),
      captureInsert: (rows) => {
        captured = rows;
      },
    });
    const ids = Array.from({ length: 3 }, () => crypto.randomUUID());
    const result = await createBulkBatch(supabase, {
      photographerUserId: 'u-1',
      projectIds: ids,
    });
    expect(result.batchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(captured.length).toBe(3);
    const payloads = (captured as Array<{ input_payload: { batchId: string } }>).map(
      (r) => r.input_payload.batchId,
    );
    expect(new Set(payloads).size).toBe(1);
    expect(payloads[0]).toBe(result.batchId);
  });

  it('NOT_FOUND si fotógrafo no tiene perfil (scoping)', async () => {
    const supabase = buildClient({ photographerRow: null });
    const ids = Array.from({ length: 3 }, () => crypto.randomUUID());
    await expect(
      createBulkBatch(supabase, { photographerUserId: 'u-orphan', projectIds: ids }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
