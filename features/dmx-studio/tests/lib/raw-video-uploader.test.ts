// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — raw-video-uploader tests.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();
const selectMock = vi.fn();

function createMockClient() {
  return {
    from: vi.fn(() => ({
      insert: (values: unknown) => {
        insertMock(values);
        return {
          select: (cols: string) => {
            selectMock(cols);
            return {
              single: () => Promise.resolve({ data: { id: 'video-uuid-test' }, error: null }),
            };
          },
        };
      },
      update: (values: unknown) => {
        updateMock(values);
        return {
          eq: (col: string, val: unknown) => {
            eqMock(col, val);
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingleMock(),
        }),
      }),
    })),
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => createMockClient(),
}));

vi.mock('@/features/dmx-studio/lib/sandbox', () => ({
  createFFmpegSandbox: vi.fn(),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

beforeEach(() => {
  insertMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  maybeSingleMock.mockReset();
  selectMock.mockReset();
  Object.assign(process.env, { NODE_ENV: 'test' });
});

describe('raw-video-uploader', () => {
  it('exports RAW_VIDEO_MAX_BYTES = 500MB', async () => {
    const { RAW_VIDEO_MAX_BYTES } = await import('@/features/dmx-studio/lib/raw-video-uploader');
    expect(RAW_VIDEO_MAX_BYTES).toBe(524_288_000);
  });

  it('exports RAW_VIDEO_MIME_TYPES with mp4 and mov', async () => {
    const { RAW_VIDEO_MIME_TYPES } = await import('@/features/dmx-studio/lib/raw-video-uploader');
    expect(RAW_VIDEO_MIME_TYPES).toEqual(['video/mp4', 'video/quicktime']);
  });

  it('rejects file size > 500MB', async () => {
    const { registerRawVideo } = await import('@/features/dmx-studio/lib/raw-video-uploader');
    await expect(
      registerRawVideo({
        userId: 'u1',
        sourceStoragePath: 'path/x.mp4',
        fileSizeBytes: 600_000_000,
        mimeType: 'video/mp4',
      }),
    ).rejects.toThrow(/exceeds max/);
  });

  it('inserts row with valid input', async () => {
    const { registerRawVideo } = await import('@/features/dmx-studio/lib/raw-video-uploader');
    const result = await registerRawVideo({
      userId: 'user-1',
      sourceStoragePath: 'path/x.mp4',
      fileSizeBytes: 100_000_000,
      mimeType: 'video/mp4',
    });
    expect(result.rawVideoId).toBe('video-uuid-test');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        file_size_bytes: 100_000_000,
        mime_type: 'video/mp4',
        transcription_status: 'pending',
      }),
    );
  });

  it('audio extractor in test mode skips ffmpeg and updates path', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'v1', source_storage_path: 'src.mp4', user_id: 'u1' },
      error: null,
    });
    const { extractAudioFromVideo } = await import(
      '@/features/dmx-studio/lib/raw-video-uploader/audio-extractor'
    );
    const result = await extractAudioFromVideo('v1');
    expect(result.audioStoragePath).toBe('u1/v1.mp3');
    expect(updateMock).toHaveBeenCalled();
  });
});
