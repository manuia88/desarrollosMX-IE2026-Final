// FASE 14.F.2 Sprint 1 — assembleVideo tests (Modo A: mocks Supabase + sandbox).
// Verifies: 3 outputs created (hook_a/b/c), project status updated to rendered,
// sandbox.stop called even when failure happens.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stopMock = vi.fn().mockResolvedValue(undefined);
const runCommandMock = vi.fn();
const sandboxInstance = { runCommand: runCommandMock, stop: stopMock };
const createSandboxMock = vi.fn().mockResolvedValue(sandboxInstance);

vi.mock('@/features/dmx-studio/lib/sandbox', () => ({
  createFFmpegSandbox: createSandboxMock,
}));

interface SupabaseTableMockState {
  selectMaybeSingle?: { data: unknown; error: { message: string } | null };
  selectMany?: { data: unknown[]; error: { message: string } | null };
  upsertResult?: { data: unknown; error: { message: string } | null };
  updateResult?: { data: unknown; error: { message: string } | null };
}

const supabaseState: Record<string, SupabaseTableMockState> = {};
const storageUploadMock = vi.fn();

function buildSupabaseMock() {
  const fromHandler = (table: string) => {
    const state = supabaseState[table] ?? {};
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      maybeSingle: vi
        .fn()
        .mockResolvedValue(state.selectMaybeSingle ?? { data: null, error: null }),
      _selectManyResolver: state.selectMany ?? { data: [], error: null },
      upsert: vi.fn().mockResolvedValue(state.upsertResult ?? { data: null, error: null }),
      update: () => ({
        eq: vi.fn().mockResolvedValue(state.updateResult ?? { data: null, error: null }),
      }),
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for fire-and-forget queries.
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve(state.selectMany ?? { data: [], error: null }).then(onFulfilled);
      },
    };
    return chain;
  };

  return {
    from: vi.fn(fromHandler),
    storage: {
      from: vi.fn(() => ({ upload: storageUploadMock })),
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildSupabaseMock()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

beforeEach(() => {
  for (const key of Object.keys(supabaseState)) delete supabaseState[key];
  stopMock.mockClear();
  runCommandMock.mockReset();
  createSandboxMock.mockClear();
  storageUploadMock.mockReset();
  storageUploadMock.mockResolvedValue({ data: { path: 'mock' }, error: null });

  supabaseState.studio_video_projects = {
    selectMaybeSingle: {
      data: {
        id: 'project-123',
        status: 'rendering',
        director_brief: {
          hooks: ['Hook A copy', 'Hook B copy', 'Hook C copy'],
        },
      },
      error: null,
    },
    updateResult: { data: null, error: null },
  };
  supabaseState.studio_video_assets = {
    selectMany: {
      data: [
        {
          id: 'asset-narr',
          asset_type: 'voiceover',
          storage_url: 'https://example.com/narration.mp3',
          order_index: 0,
          duration_seconds: 60,
        },
      ],
      error: null,
    },
  };
  supabaseState.studio_api_jobs = {
    selectMany: {
      data: [
        {
          id: 'job-1',
          job_type: 'kling_render',
          status: 'completed',
          output_payload: { clip_url: 'https://example.com/clip1.mp4' },
        },
        {
          id: 'job-2',
          job_type: 'kling_render',
          status: 'completed',
          output_payload: { clip_url: 'https://example.com/clip2.mp4' },
        },
      ],
      error: null,
    },
  };
  supabaseState.studio_video_outputs = {
    upsertResult: { data: null, error: null },
  };

  // FFmpeg shell calls and base64 reads always succeed.
  runCommandMock.mockImplementation(async (_cmd: string, args: ReadonlyArray<string>) => {
    const wrapped = args.join(' ');
    if (wrapped.includes('base64')) {
      return {
        exitCode: 0,
        stdout: async () => Buffer.from('mock-video-bytes').toString('base64'),
      };
    }
    return { exitCode: 0, stdout: async () => '' };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('assembleVideo — happy path', () => {
  it('creates 3 outputs (hook_a, hook_b, hook_c) at 9x16 format', async () => {
    const { assembleVideo } = await import('../../../lib/assembler/video-assembler');
    const result = await assembleVideo({ projectId: 'project-123', userId: 'user-abc' });
    expect(result.ok).toBe(true);
    expect(result.outputs).toHaveLength(3);
    const variants = result.outputs.map((o) => o.hookVariant).sort();
    expect(variants).toEqual(['hook_a', 'hook_b', 'hook_c']);
    for (const o of result.outputs) {
      expect(o.format).toBe('9x16');
      expect(o.storagePath).toContain('user-abc/project-123/');
      expect(o.storagePath.endsWith('_9x16.mp4')).toBe(true);
    }
  });

  it('updates project status to rendered with rendered_at timestamp', async () => {
    const { createAdminClient } = await import('@/shared/lib/supabase/admin');
    const adminMock = createAdminClient as unknown as ReturnType<typeof vi.fn>;
    const captured: Array<{ table: string; payload: unknown }> = [];
    adminMock.mockImplementation(() => {
      const supabaseMock = buildSupabaseMock();
      const originalFrom = supabaseMock.from;
      supabaseMock.from = vi.fn((table: string) => {
        const handle = originalFrom(table) as unknown as Record<string, unknown>;
        const baseUpdate = handle.update as (payload: unknown) => unknown;
        handle.update = (payload: unknown) => {
          captured.push({ table, payload });
          return baseUpdate(payload);
        };
        return handle as unknown as ReturnType<typeof originalFrom>;
      });
      return supabaseMock;
    });

    const { assembleVideo } = await import('../../../lib/assembler/video-assembler');
    await assembleVideo({ projectId: 'project-123', userId: 'user-abc' });

    const projectUpdate = captured.find((c) => c.table === 'studio_video_projects');
    expect(projectUpdate).toBeTruthy();
    const payload = projectUpdate?.payload as { status: string; rendered_at: string };
    expect(payload.status).toBe('rendered');
    expect(typeof payload.rendered_at).toBe('string');
    expect(payload.rendered_at.length).toBeGreaterThan(10);
  });
});

describe('assembleVideo — failure cleanup', () => {
  it('calls sandbox.stop() in finally block even when ffmpeg fails', async () => {
    runCommandMock.mockReset();
    runCommandMock.mockImplementation(async (_cmd: string, _args: ReadonlyArray<string>) => {
      return { exitCode: 1, stdout: async () => 'ffmpeg error' };
    });

    const { assembleVideo } = await import('../../../lib/assembler/video-assembler');
    await expect(assembleVideo({ projectId: 'project-123', userId: 'user-abc' })).rejects.toThrow();
    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('calls sandbox.stop() also on success path', async () => {
    const { assembleVideo } = await import('../../../lib/assembler/video-assembler');
    await assembleVideo({ projectId: 'project-123', userId: 'user-abc' });
    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});

describe('assembleVideo — ffmpeg-commands pure builders smoke', () => {
  it('builds shell command strings with quoted paths and canon flags', async () => {
    const mod = await import('../../../lib/assembler/ffmpeg-commands');
    expect(mod.buildConcatCommand(['/tmp/a.mp4', '/tmp/b.mp4'], '/tmp/out.mp4')).toContain(
      'ffmpeg',
    );
    expect(mod.buildExport9x16Command('/tmp/in.mp4', '/tmp/out.mp4', 'Hook A')).toContain(
      'scale=1080:1920',
    );
    expect(mod.buildMusicMixCommand('/tmp/in.mp4', '/tmp/m.mp3', -20, '/tmp/out.mp4')).toContain(
      'amix',
    );
    expect(mod.buildOverlayNarrationCommand('/tmp/in.mp4', '/tmp/n.mp3', '/tmp/out.mp4')).toContain(
      'amix',
    );
    expect(mod.buildCrossfadeCommand('/tmp/in.mp4', 0.5, '/tmp/out.mp4')).toContain('fade');
    expect(() => mod.buildConcatCommand([], '/tmp/out.mp4')).toThrow();
  });
});
