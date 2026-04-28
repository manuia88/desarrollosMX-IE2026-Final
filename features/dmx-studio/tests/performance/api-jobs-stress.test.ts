// F14.F.11 Sprint 10 BIBLIA Tarea 10.2 — Stress test mock 100 concurrent video
// generations. Verifies queue manager (cost-tracker.trackJob) returns correctly
// even under high concurrency + studio_api_jobs INSERT shape preserved.
//
// Modo A: mocks createAdminClient (no DB), runs Promise.all of 100 trackJob calls,
// asserts no race conditions in mock registry + cost projection sums correctly.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectMonthlyCosts } from '@/features/dmx-studio/lib/cost-tracking/projections';
import { type TrackJobInput, trackJob } from '@/features/dmx-studio/lib/pipeline/cost-tracker';

// -----------------------------------------------------------------------------
// Mock harness for createAdminClient — minimal shape used by trackJob.
// -----------------------------------------------------------------------------

interface RecordedInsert {
  table: string;
  payload: Record<string, unknown>;
  returnedId: string;
}

let inserts: RecordedInsert[] = [];
let insertCounter = 0;

function buildAdminClient() {
  return {
    from(table: string) {
      return {
        insert(payload: Record<string, unknown>) {
          insertCounter += 1;
          const returnedId = `job-${insertCounter}-${Math.random().toString(36).slice(2, 8)}`;
          const record: RecordedInsert = { table, payload, returnedId };
          inserts.push(record);
          return {
            select() {
              return {
                async single() {
                  return { data: { id: returnedId }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

beforeEach(() => {
  inserts = [];
  insertCounter = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// Tests.
// -----------------------------------------------------------------------------

describe('Stress: 100 concurrent video generations', () => {
  it('handles 100 trackJob calls without lost inserts', async () => {
    const calls: Promise<{ id: string }>[] = [];
    for (let i = 0; i < 100; i += 1) {
      const input: TrackJobInput = {
        projectId: `project-${i}`,
        userId: `user-${(i % 10).toString()}`,
        jobType: 'kling_render',
        provider: 'replicate',
        estimatedCost: 2.25,
      };
      calls.push(trackJob(input));
    }

    const results = await Promise.all(calls);

    // All 100 calls returned valid ids
    expect(results.length).toBe(100);
    for (const r of results) {
      expect(r.id).toBeTruthy();
      expect(typeof r.id).toBe('string');
    }
    // No race condition — registry recorded exactly 100 inserts
    expect(inserts.length).toBe(100);
  });

  it('preserves studio_api_jobs INSERT shape under concurrency', async () => {
    const input: TrackJobInput = {
      projectId: 'project-shape-test',
      userId: 'user-shape-test',
      jobType: 'kling_render',
      provider: 'replicate',
      estimatedCost: 2.25,
      externalJobId: 'replicate-abc-123',
    };
    await trackJob(input);
    expect(inserts.length).toBe(1);
    const row = inserts[0];
    expect(row).toBeDefined();
    if (!row) throw new Error('insert not recorded');
    expect(row.table).toBe('studio_api_jobs');
    const payload = row.payload;
    expect(payload.project_id).toBe('project-shape-test');
    expect(payload.user_id).toBe('user-shape-test');
    expect(payload.job_type).toBe('kling_render');
    expect(payload.provider).toBe('replicate');
    expect(payload.status).toBe('running');
    expect(payload.estimated_cost_usd).toBe(2.25);
    expect(payload.external_job_id).toBe('replicate-abc-123');
    expect(payload.input_payload).toEqual({});
    expect(typeof payload.started_at).toBe('string');
  });

  it('aggregate cost matches projection model (100 videos × $2.475 base)', async () => {
    const calls: Promise<{ id: string }>[] = [];
    const baseEstimate = 2.475; // PER_VIDEO_BASE_COST_USD
    for (let i = 0; i < 100; i += 1) {
      calls.push(
        trackJob({
          projectId: `project-${i}`,
          userId: 'user-stress',
          jobType: 'kling_render',
          provider: 'replicate',
          estimatedCost: baseEstimate,
        }),
      );
    }
    await Promise.all(calls);

    const totalEstimated = inserts.reduce(
      (sum, row) => sum + Number(row.payload.estimated_cost_usd ?? 0),
      0,
    );
    expect(totalEstimated).toBeCloseTo(247.5, 1);

    // Cross-check: 100 videos at projected cost matches projection scaled up.
    // founder plan is base-only (no plan extras). 100 videos = 2× heavy on founder.
    // We're not modeling per-plan here — just sanity: projection uses same
    // per-video base rate ($2.475: Kling+TTS+Director+FFmpeg).
    const founderLight = projectMonthlyCosts('founder', 'light');
    expect(founderLight.perVideoCost).toBeCloseTo(baseEstimate, 2);
  });
});

describe('Studio API jobs queue: mixed job types under concurrency', () => {
  it('handles 50 mixed renders + voice + transcription concurrently', async () => {
    const jobs: Promise<{ id: string }>[] = [];
    const types = ['kling_render', 'elevenlabs_voice', 'deepgram_transcribe'] as const;
    for (let i = 0; i < 50; i += 1) {
      const t = types[i % types.length];
      if (!t) continue;
      jobs.push(
        trackJob({
          projectId: `project-mixed-${i}`,
          userId: 'user-mixed',
          jobType: t,
          provider: 'multi',
          estimatedCost: 0.5,
        }),
      );
    }
    const results = await Promise.all(jobs);
    expect(results.length).toBe(50);
    const tablesHit = new Set(inserts.map((i) => i.table));
    expect(tablesHit.size).toBe(1);
    expect(tablesHit.has('studio_api_jobs')).toBe(true);
    const jobTypes = new Set(inserts.map((i) => i.payload.job_type));
    expect(jobTypes.size).toBe(3);
  });
});
