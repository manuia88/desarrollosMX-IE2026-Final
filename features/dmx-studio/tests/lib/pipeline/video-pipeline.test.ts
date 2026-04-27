// FASE 14.F.2 Sprint 1 — video-pipeline.ts orchestrator unit tests (Tarea 1.5 BIBLIA).
// Modo A: createCaller mocks. Mocks supabase admin via dep injection + wrappers via runKling/runTts/runMusic.

import { describe, expect, it, vi } from 'vitest';
import { kickoffVideoPipeline } from '@/features/dmx-studio/lib/pipeline/video-pipeline';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

interface RecordedRow {
  table: string;
  payload: unknown;
}

interface BuildMockOpts {
  readonly directorBrief?: Record<string, unknown>;
  readonly voiceCloneId?: string | null;
  readonly hasAsset?: boolean;
  readonly voiceCloneRow?: { elevenlabs_voice_id: string | null; status: string } | null;
}

function defaultDirectorBrief(): Record<string, unknown> {
  return {
    narrativeOrder: ['fachada', 'sala', 'cocina', 'recamara'],
    klingPrompts: [
      {
        sceneIndex: 0,
        prompt: 'Cinematic pan fachada',
        cameraMovement: 'pan_left',
        durationSeconds: 5,
      },
      { sceneIndex: 1, prompt: 'Slow zoom sala', cameraMovement: 'zoom_in', durationSeconds: 5 },
    ],
    moodMusic: { genre: 'cinematic', tempo: 'slow', prompt: 'warm cinematic ambient' },
    hooks: ['Hook 1', 'Hook 2', 'Hook 3'],
    copyPack: {
      captionInstagram: 'Hermoso departamento en venta.',
      hashtags: ['#bienesraices', '#cdmx', '#departamento'],
      messageWhatsapp: 'Hola, tengo este depa para ti...',
      descriptionPortal: 'Departamento con vista panoramica en zona prime.',
    },
    narrationScript:
      'Bienvenido a este hogar diseñado para ti, con vistas inmejorables y acabados de lujo.',
  };
}

interface MockHarness {
  readonly inserts: RecordedRow[];
  readonly updates: Array<{ table: string; id?: string; payload: unknown }>;
  readonly client: AdminClient;
}

function buildMockClient(opts: BuildMockOpts = {}): MockHarness {
  const inserts: RecordedRow[] = [];
  const updates: Array<{ table: string; id?: string; payload: unknown }> = [];
  const directorBrief = opts.directorBrief ?? defaultDirectorBrief();
  const voiceCloneId = opts.voiceCloneId ?? null;
  const hasAsset = opts.hasAsset !== false;
  const voiceCloneRow = opts.voiceCloneRow ?? null;
  let insertCounter = 0;

  function makeInsertChain(table: string, payload: unknown) {
    inserts.push({ table, payload });
    insertCounter += 1;
    const generatedId = `${table}_id_${insertCounter}`;
    return {
      select() {
        return {
          async single() {
            return { data: { id: generatedId }, error: null };
          },
        };
      },
    };
  }

  function makeUpdateChain(table: string, payload: unknown) {
    return {
      eq(_col: string, id: string) {
        updates.push({ table, id, payload });
        return Promise.resolve({ error: null });
      },
    };
  }

  function makeSelectChain(table: string) {
    if (table === 'studio_video_projects') {
      return {
        select(_cols: string) {
          return {
            eq(_col1: string, _val1: string) {
              return {
                eq(_col2: string, _val2: string) {
                  return {
                    async maybeSingle() {
                      return {
                        data: {
                          director_brief: directorBrief,
                          voice_clone_id: voiceCloneId,
                        },
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    }
    if (table === 'studio_video_assets') {
      return {
        select(_cols: string) {
          return {
            eq(_col1: string, _val1: string) {
              return {
                eq(_col2: string, _val2: string) {
                  return {
                    order(_col: string, _opts: unknown) {
                      return {
                        limit(_n: number) {
                          return {
                            async maybeSingle() {
                              if (!hasAsset) return { data: null, error: null };
                              return {
                                data: { storage_url: 'https://images.example.com/a.jpg' },
                                error: null,
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    }
    if (table === 'studio_voice_clones') {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                async maybeSingle() {
                  return { data: voiceCloneRow, error: null };
                },
              };
            },
          };
        },
      };
    }
    return {
      select() {
        return {
          eq() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          return makeInsertChain(table, payload);
        },
        update(payload: unknown) {
          return makeUpdateChain(table, payload);
        },
        ...makeSelectChain(table),
      };
    },
  } as unknown as AdminClient;

  return { inserts, updates, client };
}

describe('kickoffVideoPipeline', () => {
  it('all 3 stages succeed in parallel and persists copy outputs', async () => {
    const mock = buildMockClient();
    const runKling = vi.fn().mockResolvedValue({
      videoUrl: 'https://video.example/clip.mp4',
      durationSeconds: 5,
      costUsd: 0.3,
      requestId: 'kling_test_1',
    });
    const runTts = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([1, 2, 3]),
      durationSecondsEstimate: 8,
      costUsd: 0.05,
    });
    const runMusic = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([9, 8, 7]),
      durationSeconds: 30,
    });

    const result = await kickoffVideoPipeline(
      { projectId: 'proj_1', userId: 'user_1' },
      { client: mock.client, runKling, runTts, runMusic },
    );

    expect(result.ok).toBe(true);
    expect(result.stages).toHaveLength(4);
    expect(result.stages[0]?.status).toBe('completed');
    expect(result.stages[1]?.status).toBe('completed');
    expect(result.stages[2]?.status).toBe('completed');
    expect(result.stages[3]?.status).toBe('queued');

    expect(runKling).toHaveBeenCalledTimes(2);
    expect(runTts).toHaveBeenCalledTimes(1);
    expect(runMusic).toHaveBeenCalledTimes(1);

    const apiJobInserts = mock.inserts.filter((i) => i.table === 'studio_api_jobs');
    expect(apiJobInserts.length).toBe(4);
    const copyOutputInserts = mock.inserts.filter((i) => i.table === 'studio_copy_outputs');
    expect(copyOutputInserts).toHaveLength(1);
    const copyRows = copyOutputInserts[0]?.payload as ReadonlyArray<{ channel: string }>;
    expect(copyRows.map((r) => r.channel)).toEqual(
      expect.arrayContaining([
        'instagram_caption',
        'wa_message',
        'portal_listing',
        'hashtags',
        'narration_script',
      ]),
    );
    const usageInserts = mock.inserts.filter((i) => i.table === 'studio_usage_logs');
    expect(usageInserts).toHaveLength(1);
  });

  it('partial fail with retry: kling fails twice then succeeds', async () => {
    const mock = buildMockClient();
    let klingCalls = 0;
    const runKling = vi.fn().mockImplementation(async () => {
      klingCalls += 1;
      if (klingCalls < 3) {
        throw new Error(`replicate_transient_${klingCalls}`);
      }
      return {
        videoUrl: 'https://video.example/clip.mp4',
        durationSeconds: 5,
        costUsd: 0.3,
        requestId: 'kling_retry',
      };
    });
    const runTts = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([1]),
      durationSecondsEstimate: 8,
      costUsd: 0.05,
    });
    const runMusic = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([2]),
      durationSeconds: 30,
    });

    const result = await kickoffVideoPipeline(
      {
        projectId: 'proj_1',
        userId: 'user_1',
      },
      {
        client: mock.client,
        runKling,
        runTts,
        runMusic,
      },
    );

    // klingPrompts has 2 prompts. First prompt = retry path (fails 2x then ok = 3 calls).
    // Second prompt succeeds first try (1 call). Total 4 kling calls minimum (3 + 1).
    expect(klingCalls).toBeGreaterThanOrEqual(3);
    // At least one kling job should still complete. Result.ok depends on whether ALL clip prompts
    // succeed. With backoff retry maxAttempts=3, both eventually succeed.
    expect(result.stages[0]?.status).toBe('completed');
  });

  it('retry exhausted updates project status to failed', async () => {
    const mock = buildMockClient();
    const runKling = vi.fn().mockRejectedValue(new Error('persistent_replicate_500'));
    const runTts = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([1]),
      durationSecondsEstimate: 8,
      costUsd: 0.05,
    });
    const runMusic = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([2]),
      durationSeconds: 30,
    });

    const result = await kickoffVideoPipeline(
      { projectId: 'proj_1', userId: 'user_1' },
      { client: mock.client, runKling, runTts, runMusic },
    );

    expect(result.ok).toBe(false);
    expect(result.stages[0]?.status).toBe('failed');
    const projectUpdates = mock.updates.filter((u) => u.table === 'studio_video_projects');
    const failedMarker = projectUpdates.find(
      (u) => (u.payload as Record<string, unknown>).status === 'failed',
    );
    expect(failedMarker).toBeDefined();
  });

  it('cost-tracker rows inserted per stage and per kling clip', async () => {
    const mock = buildMockClient();
    const runKling = vi.fn().mockResolvedValue({
      videoUrl: 'https://video.example/clip.mp4',
      durationSeconds: 5,
      costUsd: 0.3,
      requestId: 'kling_x',
    });
    const runTts = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([1, 2, 3]),
      durationSecondsEstimate: 8,
      costUsd: 0.05,
    });
    const runMusic = vi.fn().mockResolvedValue({
      audioBuffer: new Uint8Array([9, 8, 7]),
      durationSeconds: 30,
    });

    await kickoffVideoPipeline(
      { projectId: 'proj_1', userId: 'user_1' },
      { client: mock.client, runKling, runTts, runMusic },
    );

    const apiJobInserts = mock.inserts.filter((i) => i.table === 'studio_api_jobs');
    expect(apiJobInserts).toHaveLength(4);
    const klingJobs = apiJobInserts.filter(
      (i) => (i.payload as Record<string, unknown>).job_type === 'kling_render',
    );
    expect(klingJobs).toHaveLength(2);
    const evJobs = apiJobInserts.filter(
      (i) => (i.payload as Record<string, unknown>).job_type === 'elevenlabs_voice',
    );
    expect(evJobs).toHaveLength(2);

    // Each running insert should produce a corresponding completed update.
    const completedUpdates = mock.updates.filter(
      (u) =>
        u.table === 'studio_api_jobs' &&
        (u.payload as Record<string, unknown>).status === 'completed',
    );
    expect(completedUpdates).toHaveLength(4);
  });
});
