// FASE 14.F.2 Sprint 1 — cost-tracker.ts unit tests (Tarea 1.5 BIBLIA).

import { describe, expect, it } from 'vitest';
import {
  completeJob,
  failJob,
  logPipelineUsage,
  trackJob,
} from '@/features/dmx-studio/lib/pipeline/cost-tracker';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface RecordedInsert {
  table: string;
  payload: unknown;
}

interface RecordedUpdate {
  table: string;
  id?: string;
  payload: unknown;
}

interface MockClient {
  inserts: RecordedInsert[];
  updates: RecordedUpdate[];
  client: AdminClient;
}

function buildMockClient(opts?: {
  insertResult?: { id: string };
  insertError?: { message: string };
  updateError?: { message: string };
}): MockClient {
  const inserts: RecordedInsert[] = [];
  const updates: RecordedUpdate[] = [];
  const insertResult = opts?.insertResult ?? { id: 'job_test_1' };
  const insertError = opts?.insertError ?? null;
  const updateError = opts?.updateError ?? null;

  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          inserts.push({ table, payload });
          return {
            select() {
              return {
                async single() {
                  if (insertError) return { data: null, error: insertError };
                  return { data: insertResult, error: null };
                },
              };
            },
          };
        },
        update(payload: unknown) {
          return {
            eq(_col: string, id: string) {
              updates.push({ table, id, payload });
              return Promise.resolve({ error: updateError });
            },
          };
        },
      };
    },
  } as unknown as AdminClient;

  return { inserts, updates, client };
}

describe('cost-tracker.trackJob', () => {
  it('inserts studio_api_jobs row and returns id', async () => {
    const mock = buildMockClient({ insertResult: { id: 'job_abc' } });
    const result = await trackJob(
      {
        projectId: 'proj_1',
        userId: 'user_1',
        jobType: 'kling_render',
        provider: 'kling',
        estimatedCost: 0.3,
        inputPayload: { prompt: 'cinematic shot' },
      },
      { client: mock.client },
    );
    expect(result.id).toBe('job_abc');
    expect(mock.inserts).toHaveLength(1);
    const firstInsert = mock.inserts[0];
    expect(firstInsert?.table).toBe('studio_api_jobs');
    const payload = firstInsert?.payload as Record<string, unknown>;
    expect(payload.project_id).toBe('proj_1');
    expect(payload.user_id).toBe('user_1');
    expect(payload.job_type).toBe('kling_render');
    expect(payload.provider).toBe('kling');
    expect(payload.status).toBe('running');
    expect(payload.estimated_cost_usd).toBe(0.3);
  });

  it('throws when insert returns error', async () => {
    const mock = buildMockClient({
      insertResult: { id: '' },
      insertError: { message: 'rls_violation' },
    });
    await expect(
      trackJob(
        {
          projectId: 'proj_1',
          userId: 'user_1',
          jobType: 'elevenlabs_voice',
          provider: 'elevenlabs',
          estimatedCost: 0.05,
        },
        { client: mock.client },
      ),
    ).rejects.toThrow(/cost-tracker.trackJob failed/);
  });
});

describe('cost-tracker.completeJob', () => {
  it('updates row to status=completed with output and cost', async () => {
    const mock = buildMockClient();
    await completeJob('job_xyz', { videoUrl: 'https://x' }, 0.42, { client: mock.client });
    expect(mock.updates).toHaveLength(1);
    const update = mock.updates[0];
    expect(update?.table).toBe('studio_api_jobs');
    expect(update?.id).toBe('job_xyz');
    const payload = update?.payload as Record<string, unknown>;
    expect(payload.status).toBe('completed');
    expect(payload.actual_cost_usd).toBe(0.42);
    expect(payload.output_payload).toEqual({ videoUrl: 'https://x' });
    expect(typeof payload.completed_at).toBe('string');
  });
});

describe('cost-tracker.failJob', () => {
  it('updates row with error_message + status=failed', async () => {
    const mock = buildMockClient();
    await failJob('job_zzz', 'replicate timeout', 3, { client: mock.client });
    expect(mock.updates).toHaveLength(1);
    const payload = mock.updates[0]?.payload as Record<string, unknown>;
    expect(payload.status).toBe('failed');
    expect(payload.error_message).toBe('replicate timeout');
    expect(payload.attempt_count).toBe(3);
  });
});

describe('cost-tracker.logPipelineUsage', () => {
  it('inserts studio_usage_logs row with period_month and metric_type', async () => {
    const mock = buildMockClient({ insertResult: { id: 'usage_abc' } });
    const result = await logPipelineUsage(
      {
        userId: 'user_1',
        projectId: 'proj_1',
        metricType: 'video_render',
        metricAmount: 4,
        costUsd: 1.2,
      },
      { client: mock.client },
    );
    expect(result.id).toBe('usage_abc');
    const insert = mock.inserts[0];
    expect(insert?.table).toBe('studio_usage_logs');
    const payload = insert?.payload as Record<string, unknown>;
    expect(payload.metric_type).toBe('video_render');
    expect(payload.metric_amount).toBe(4);
    expect(payload.cost_usd).toBe(1.2);
    expect(typeof payload.period_month).toBe('string');
    expect((payload.period_month as string).match(/^\d{4}-\d{2}$/)).not.toBeNull();
  });
});
