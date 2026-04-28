// F14.F.6 Sprint 5 BIBLIA Tarea 5.4 — FFmpeg cutter tests.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingleMock = vi.fn();
const updateChainEqMock = vi.fn();
const upsertSelectSingleMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => maybeSingleMock() }) }),
      update: () => ({
        eq: (col: string, val: unknown) => {
          updateChainEqMock(col, val);
          return Promise.resolve({ data: null, error: null });
        },
      }),
      upsert: () => ({
        select: () => ({
          single: () => upsertSelectSingleMock(),
        }),
      }),
    })),
  }),
}));

vi.mock('@/features/dmx-studio/lib/sandbox', () => ({
  createFFmpegSandbox: vi.fn(),
}));

vi.mock('@/features/dmx-studio/lib/claude-director', () => ({
  getDirectorClient: vi.fn(),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

beforeEach(() => {
  maybeSingleMock.mockReset();
  updateChainEqMock.mockReset();
  upsertSelectSingleMock.mockReset();
  Object.assign(process.env, { NODE_ENV: 'test' });
});

describe('edl-applier', () => {
  it('computes keep segments from cuts inverse', async () => {
    const { computeKeepSegments } = await import(
      '@/features/dmx-studio/lib/raw-video-cutter/edl-applier'
    );
    const keeps = computeKeepSegments(
      [
        { startMs: 1000, endMs: 2000 },
        { startMs: 5000, endMs: 6000 },
      ],
      10000,
    );
    expect(keeps).toEqual([
      { startMs: 0, endMs: 1000 },
      { startMs: 2000, endMs: 5000 },
      { startMs: 6000, endMs: 10000 },
    ]);
  });

  it('returns full segment when no cuts', async () => {
    const { computeKeepSegments } = await import(
      '@/features/dmx-studio/lib/raw-video-cutter/edl-applier'
    );
    const keeps = computeKeepSegments([], 5000);
    expect(keeps).toEqual([{ startMs: 0, endMs: 5000 }]);
  });

  it('applyEdlCuts in test mode skips ffmpeg and updates path', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'v1',
        user_id: 'u1',
        source_storage_path: 'src.mp4',
        edl: [{ startMs: 1000, endMs: 2000 }],
        duration_seconds: 60,
      },
      error: null,
    });
    const { applyEdlCuts } = await import('@/features/dmx-studio/lib/raw-video-cutter/edl-applier');
    const result = await applyEdlCuts('v1');
    expect(result.cleanedStoragePath).toBe('u1/v1-cleaned.mp4');
    expect(result.cutsApplied).toBe(1);
  });
});

describe('smart-edl-preview', () => {
  it('returns cuts with before/after windows', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'v1',
        edl: [{ startMs: 5000, endMs: 6000, reason: 'filler', preview: 'este' }],
        duration_seconds: 30,
      },
      error: null,
    });
    const { getEdlPreview } = await import(
      '@/features/dmx-studio/lib/raw-video-cutter/smart-edl-preview'
    );
    const result = await getEdlPreview('v1');
    expect(result.cuts).toHaveLength(1);
    expect(result.cuts[0]?.beforeMs).toBe(3500);
    expect(result.cuts[0]?.afterMs).toBe(7500);
    expect(result.cuts[0]?.reason).toBe('filler');
  });
});

describe('highlight-reels-generator', () => {
  it('uses heuristic specs in test mode', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'v1',
        user_id: 'u1',
        source_storage_path: 'src.mp4',
        duration_seconds: 360,
        transcription: {
          utterances: Array.from({ length: 20 }, (_, i) => ({
            start: i * 18,
            end: i * 18 + 5,
            transcript: `frase ${i}`,
          })),
        },
      },
      error: null,
    });
    upsertSelectSingleMock.mockImplementation(() =>
      Promise.resolve({
        data: {
          id: `reel-${Math.random()}`,
          clip_index: 1,
          start_ms: 1000,
          end_ms: 21000,
          status: 'pending',
        },
        error: null,
      }),
    );

    const { generateHighlightReels } = await import(
      '@/features/dmx-studio/lib/raw-video-cutter/highlight-reels-generator'
    );
    const result = await generateHighlightReels('v1');
    expect(result.reels.length).toBeGreaterThan(0);
    expect(result.reels.length).toBeLessThanOrEqual(3);
  });
});
