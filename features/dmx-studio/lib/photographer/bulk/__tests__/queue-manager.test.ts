// F14.F.10 Sprint 9 SUB-AGENT 3 — queue-manager tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import {
  cancelBatch,
  checkRateLimit,
  getQueueStatus,
  MAX_CONCURRENT_JOBS_PER_PHOTOGRAPHER,
} from '../queue-manager';

type StudioAdminClient = SupabaseClient<Database>;

interface JobRow {
  id: string;
  project_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  input_payload: Record<string, unknown>;
}

interface SelectFlow {
  data: ReadonlyArray<JobRow> | null;
  error: Error | null;
}

interface BuildSelectQueryOpts {
  readonly response: SelectFlow;
  readonly captureUpdate?: (payload: unknown, ids: ReadonlyArray<string>) => void;
}

function buildJobsClient(opts: BuildSelectQueryOpts): StudioAdminClient {
  const fromImpl = vi.fn((table: string) => {
    if (table !== 'studio_api_jobs') return {};
    let inIds: ReadonlyArray<string> = [];
    let updatePayload: unknown = null;
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => opts.response,
            }),
            in: async () => opts.response,
          }),
        }),
      }),
      update: (payload: unknown) => {
        updatePayload = payload;
        return {
          in: (_col: string, ids: ReadonlyArray<string>) => {
            inIds = ids;
            return {
              eq: async () => {
                if (opts.captureUpdate) opts.captureUpdate(updatePayload, inIds);
                return { error: null };
              },
            };
          },
        };
      },
    };
  });
  return { from: fromImpl } as unknown as StudioAdminClient;
}

describe('photographer/bulk/queue-manager', () => {
  it('getQueueStatus aggrega counts y filtra por batchId del payload', async () => {
    const targetBatch = 'batch-target';
    const otherBatch = 'batch-other';
    const jobs: ReadonlyArray<JobRow> = [
      {
        id: 'j1',
        project_id: 'p1',
        status: 'completed',
        created_at: '2026-04-27T00:00:00Z',
        completed_at: '2026-04-27T00:05:00Z',
        input_payload: { batchId: targetBatch },
      },
      {
        id: 'j2',
        project_id: 'p2',
        status: 'queued',
        created_at: '2026-04-27T00:00:00Z',
        completed_at: null,
        input_payload: { batchId: targetBatch },
      },
      {
        id: 'j3',
        project_id: 'p3',
        status: 'completed',
        created_at: '2026-04-27T00:00:00Z',
        completed_at: '2026-04-27T00:05:00Z',
        input_payload: { batchId: otherBatch },
      },
    ];
    const supabase = buildJobsClient({ response: { data: jobs, error: null } });
    const status = await getQueueStatus(supabase, 'u-1', targetBatch);
    expect(status.batchId).toBe(targetBatch);
    expect(status.total).toBe(2);
    expect(status.completed).toBe(1);
    expect(status.counts.queued).toBe(1);
    expect(status.allCompleted).toBe(false);
    expect(status.progressPct).toBe(50);
  });

  it('cancelBatch marca jobs activos como cancelled y devuelve count', async () => {
    const targetBatch = 'batch-cancel';
    const jobs: ReadonlyArray<JobRow> = [
      {
        id: 'j1',
        project_id: 'p1',
        status: 'completed',
        created_at: '2026-04-27T00:00:00Z',
        completed_at: '2026-04-27T00:05:00Z',
        input_payload: { batchId: targetBatch },
      },
      {
        id: 'j2',
        project_id: 'p2',
        status: 'queued',
        created_at: '2026-04-27T00:00:00Z',
        completed_at: null,
        input_payload: { batchId: targetBatch },
      },
      {
        id: 'j3',
        project_id: 'p3',
        status: 'running',
        created_at: '2026-04-27T00:00:00Z',
        completed_at: null,
        input_payload: { batchId: targetBatch },
      },
    ];
    let updateCalled: { payload: unknown; ids: ReadonlyArray<string> } | null = null;
    const supabase = buildJobsClient({
      response: { data: jobs, error: null },
      captureUpdate: (payload, ids) => {
        updateCalled = { payload, ids };
      },
    });
    const result = await cancelBatch(supabase, 'u-1', targetBatch);
    expect(result.cancelledCount).toBe(2);
    expect(updateCalled).not.toBeNull();
    expect((updateCalled as unknown as { payload: { status: string } }).payload.status).toBe(
      'cancelled',
    );
    expect((updateCalled as unknown as { ids: string[] }).ids.sort()).toEqual(['j2', 'j3']);
  });

  it('checkRateLimit retorna allowed=false cuando concurrent ≥ MAX', async () => {
    const activeJobs: ReadonlyArray<JobRow> = Array.from({ length: 11 }, (_, i) => ({
      id: `j${i}`,
      project_id: null,
      status: 'queued',
      created_at: '2026-04-27T00:00:00Z',
      completed_at: null,
      input_payload: {},
    }));
    const supabase = buildJobsClient({ response: { data: activeJobs, error: null } });
    const check = await checkRateLimit(supabase, 'u-1');
    expect(check.allowed).toBe(false);
    expect(check.limit).toBe(MAX_CONCURRENT_JOBS_PER_PHOTOGRAPHER);
    expect(check.currentConcurrent).toBe(11);
  });
});
