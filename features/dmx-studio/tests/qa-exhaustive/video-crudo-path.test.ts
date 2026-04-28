// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Video crudo path coverage.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre flujo: triggerTranscription (Deepgram) -> EDL analyze -> approve cuts -> apply cuts ->
//   subtitles applyStyle (cinematic/bold/minimal canon styles).

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const transcribeRawVideoMock = vi.fn(async (rawVideoId: string) => ({
  rawVideoId,
  status: 'completed' as const,
  transcription: { words: [], segments: [{ start: 0, end: 5, text: 'Hello' }] },
  costUsd: 0.005,
  provider: 'deepgram',
}));

const analyzeRawVideoMock = vi.fn(async (rawVideoId: string) => ({
  rawVideoId,
  edl: [
    { start: 0, end: 1.5, reason: 'silence', confidence: 0.9 },
    { start: 12, end: 13.2, reason: 'filler_word', confidence: 0.85 },
  ],
  chapters: [
    { index: 0, title: 'Intro', start: 0, end: 5 },
    { index: 1, title: 'Detalles', start: 5, end: 30 },
  ],
  costUsd: 0.012,
}));

const getEdlPreviewMock = vi.fn(async (rawVideoId: string) => ({
  rawVideoId,
  cuts: [
    { index: 0, start: 0, end: 1.5, reason: 'silence', preview: 'silence preview' },
    { index: 1, start: 12, end: 13.2, reason: 'filler_word', preview: 'filler preview' },
  ],
}));

const applyEdlCutsMock = vi.fn(async (rawVideoId: string) => ({
  rawVideoId,
  cleanedStoragePath: `cleaned/${rawVideoId}.mp4`,
  cutsApplied: 2,
}));

const applySubtitlesToVideoMock = vi.fn(async (args: { rawVideoId: string; styleKey: string }) => ({
  rawVideoId: args.rawVideoId,
  styleKey: args.styleKey,
  storagePath: `subtitled/${args.rawVideoId}_${args.styleKey}.mp4`,
  costUsd: 0,
}));

vi.mock('@/features/dmx-studio/lib/raw-video-pipeline/transcription-orchestrator', () => ({
  transcribeRawVideo: transcribeRawVideoMock,
}));

vi.mock('@/features/dmx-studio/lib/director/raw-video-analyzer', () => ({
  analyzeRawVideo: analyzeRawVideoMock,
}));

vi.mock('@/features/dmx-studio/lib/raw-video-cutter/smart-edl-preview', () => ({
  getEdlPreview: getEdlPreviewMock,
}));

vi.mock('@/features/dmx-studio/lib/raw-video-cutter/edl-applier', () => ({
  applyEdlCuts: applyEdlCutsMock,
}));

vi.mock('@/features/dmx-studio/lib/subtitles/ffmpeg-overlay', () => ({
  applySubtitlesToVideo: applySubtitlesToVideoMock,
}));

interface AdminTableState {
  selectMaybeSingle?: { data: Record<string, unknown> | null; error: unknown };
  updateResult?: { error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const state = adminTables[table];
      return {
        select() {
          const chain: Record<string, unknown> = {};
          chain.eq = () => chain;
          chain.maybeSingle = async () => state?.selectMaybeSingle ?? { data: null, error: null };
          chain.single = async () => state?.selectMaybeSingle ?? { data: null, error: null };
          return chain;
        },
        update() {
          return {
            eq() {
              return Promise.resolve(state?.updateResult ?? { error: null });
            },
          };
        },
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_RAW_VIDEO_ID = 'bb222222-2222-4222-8222-222222222222';

function buildCtx(): Context {
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: () => ({
      select: () => ({
        eq: () => ({
          async maybeSingle() {
            return {
              data: {
                studio_role: 'studio_user',
                organization_id: null,
                onboarding_completed: true,
              },
              error: null,
            };
          },
        }),
      }),
      insert() {
        return Promise.resolve({ error: null });
      },
    }),
  };
  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: DEFAULT_USER_ID, email: 'video-crudo@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

beforeEach(() => {
  adminTables = {};
  transcribeRawVideoMock.mockClear();
  analyzeRawVideoMock.mockClear();
  getEdlPreviewMock.mockClear();
  applyEdlCutsMock.mockClear();
  applySubtitlesToVideoMock.mockClear();
  adminTables.studio_users_extension = {
    selectMaybeSingle: {
      data: {
        studio_role: 'studio_user',
        organization_id: null,
        onboarding_completed: true,
      },
      error: null,
    },
  };
});

afterEach(() => {
  vi.resetModules();
});

describe('Video crudo path — studioRawVideoPipelineRouter.triggerTranscription', () => {
  it('returns Deepgram transcription when audio_extract_storage_path present', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          transcription_status: 'pending',
          transcription: null,
          audio_extract_storage_path: 'audio/extract.mp3',
        },
        error: null,
      },
    };
    const { studioRawVideoPipelineRouter } = await import(
      '@/features/dmx-studio/routes/raw-video-pipeline'
    );
    const caller = studioRawVideoPipelineRouter.createCaller(buildCtx());
    const result = (await caller.triggerTranscription({
      rawVideoId: DEFAULT_RAW_VIDEO_ID,
    })) as unknown as { status: string; provider: string };
    expect(result.status).toBe('completed');
    expect(result.provider).toBe('deepgram');
    expect(transcribeRawVideoMock).toHaveBeenCalledWith(DEFAULT_RAW_VIDEO_ID);
  });

  it('rejects PRECONDITION_FAILED when audio extract missing', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          transcription_status: 'pending',
          transcription: null,
          audio_extract_storage_path: null,
        },
        error: null,
      },
    };
    const { studioRawVideoPipelineRouter } = await import(
      '@/features/dmx-studio/routes/raw-video-pipeline'
    );
    const caller = studioRawVideoPipelineRouter.createCaller(buildCtx());
    await expect(caller.triggerTranscription({ rawVideoId: DEFAULT_RAW_VIDEO_ID })).rejects.toThrow(
      /audio_extract_storage_path missing/,
    );
  });

  it('rejects FORBIDDEN when video belongs to another user', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: 'other-user',
          transcription_status: 'pending',
          transcription: null,
          audio_extract_storage_path: 'audio/extract.mp3',
        },
        error: null,
      },
    };
    const { studioRawVideoPipelineRouter } = await import(
      '@/features/dmx-studio/routes/raw-video-pipeline'
    );
    const caller = studioRawVideoPipelineRouter.createCaller(buildCtx());
    await expect(caller.triggerTranscription({ rawVideoId: DEFAULT_RAW_VIDEO_ID })).rejects.toThrow(
      /FORBIDDEN/,
    );
  });
});

describe('Video crudo path — studioEdlRouter.analyze', () => {
  it('analyzes EDL only when transcription_status=completed', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          transcription: { segments: [{ start: 0, end: 5, text: 'hi' }] },
          transcription_status: 'completed',
          edl: null,
          chapters: null,
          duration_seconds: 60,
        },
        error: null,
      },
    };
    const { studioEdlRouter } = await import('@/features/dmx-studio/routes/edl');
    const caller = studioEdlRouter.createCaller(buildCtx());
    const result = await caller.analyze({ rawVideoId: DEFAULT_RAW_VIDEO_ID });
    expect(result.edl.length).toBe(2);
    expect(result.chapters.length).toBe(2);
    expect(analyzeRawVideoMock).toHaveBeenCalledTimes(1);
  });

  it('rejects PRECONDITION_FAILED when transcription not completed', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          transcription: null,
          transcription_status: 'pending',
          edl: null,
          chapters: null,
          duration_seconds: 60,
        },
        error: null,
      },
    };
    const { studioEdlRouter } = await import('@/features/dmx-studio/routes/edl');
    const caller = studioEdlRouter.createCaller(buildCtx());
    await expect(caller.analyze({ rawVideoId: DEFAULT_RAW_VIDEO_ID })).rejects.toThrow(
      /transcription_status/,
    );
  });
});

describe('Video crudo path — studioCutsRouter cuts flow', () => {
  it('approveCuts persists subset of EDL', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          edl: [
            { start: 0, end: 1.5, reason: 'silence' },
            { start: 12, end: 13.2, reason: 'filler' },
            { start: 30, end: 31, reason: 'silence' },
          ],
          cuts_applied: false,
          cleaned_storage_path: null,
          duration_seconds: 60,
          source_storage_path: 'raw/source.mp4',
        },
        error: null,
      },
      updateResult: { error: null },
    };
    const { studioCutsRouter } = await import('@/features/dmx-studio/routes/cuts');
    const caller = studioCutsRouter.createCaller(buildCtx());
    const result = await caller.approveCuts({
      rawVideoId: DEFAULT_RAW_VIDEO_ID,
      approvedCutIndices: [0, 2],
    });
    expect(result.approvedCount).toBe(2);
  });

  it('applyCuts succeeds when EDL non-empty + cuts not yet applied', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          edl: [{ start: 0, end: 1.5 }],
          cuts_applied: false,
          cleaned_storage_path: null,
          duration_seconds: 60,
          source_storage_path: 'raw/source.mp4',
        },
        error: null,
      },
    };
    const { studioCutsRouter } = await import('@/features/dmx-studio/routes/cuts');
    const caller = studioCutsRouter.createCaller(buildCtx());
    const result = await caller.applyCuts({ rawVideoId: DEFAULT_RAW_VIDEO_ID });
    expect(result.cutsApplied).toBe(2);
    expect(applyEdlCutsMock).toHaveBeenCalledTimes(1);
  });

  it('applyCuts rejects CONFLICT when cuts already applied', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          edl: [{ start: 0, end: 1.5 }],
          cuts_applied: true,
          cleaned_storage_path: 'cleaned/x.mp4',
          duration_seconds: 60,
          source_storage_path: 'raw/source.mp4',
        },
        error: null,
      },
    };
    const { studioCutsRouter } = await import('@/features/dmx-studio/routes/cuts');
    const caller = studioCutsRouter.createCaller(buildCtx());
    await expect(caller.applyCuts({ rawVideoId: DEFAULT_RAW_VIDEO_ID })).rejects.toThrow(
      /CONFLICT|already applied/,
    );
  });
});

describe('Video crudo path — studioSubtitlesRouter (3 styles canon)', () => {
  for (const styleKey of ['cinematic', 'bold', 'minimal'] as const) {
    it(`applyStyle "${styleKey}" succeeds when transcription present`, async () => {
      adminTables.studio_raw_videos = {
        selectMaybeSingle: {
          data: {
            id: DEFAULT_RAW_VIDEO_ID,
            user_id: DEFAULT_USER_ID,
            transcription: { segments: [{ start: 0, end: 5, text: 'Hello' }] },
            source_storage_path: 'raw/x.mp4',
            cleaned_storage_path: 'cleaned/x.mp4',
          },
          error: null,
        },
      };
      const { studioSubtitlesRouter } = await import('@/features/dmx-studio/routes/subtitles');
      const caller = studioSubtitlesRouter.createCaller(buildCtx());
      const result = await caller.applyStyle({
        rawVideoId: DEFAULT_RAW_VIDEO_ID,
        styleKey,
      });
      expect(result.styleKey).toBe(styleKey);
      expect(applySubtitlesToVideoMock).toHaveBeenCalledWith(expect.objectContaining({ styleKey }));
    });
  }

  it('rejects PRECONDITION_FAILED when transcription missing', async () => {
    adminTables.studio_raw_videos = {
      selectMaybeSingle: {
        data: {
          id: DEFAULT_RAW_VIDEO_ID,
          user_id: DEFAULT_USER_ID,
          transcription: null,
          source_storage_path: 'raw/x.mp4',
          cleaned_storage_path: null,
        },
        error: null,
      },
    };
    const { studioSubtitlesRouter } = await import('@/features/dmx-studio/routes/subtitles');
    const caller = studioSubtitlesRouter.createCaller(buildCtx());
    await expect(
      caller.applyStyle({ rawVideoId: DEFAULT_RAW_VIDEO_ID, styleKey: 'cinematic' }),
    ).rejects.toThrow(/transcription required/);
  });

  it('getStyles returns all canon styles', async () => {
    const { studioSubtitlesRouter } = await import('@/features/dmx-studio/routes/subtitles');
    const caller = studioSubtitlesRouter.createCaller(buildCtx());
    const styles = await caller.getStyles();
    expect(styles.length).toBeGreaterThanOrEqual(3);
    const keys = styles.map((s) => s.key);
    expect(keys).toContain('cinematic');
    expect(keys).toContain('bold');
    expect(keys).toContain('minimal');
  });
});
