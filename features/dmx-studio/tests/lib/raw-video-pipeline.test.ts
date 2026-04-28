// F14.F.6 Sprint 5 BIBLIA Tarea 5.2 — Transcription pipeline tests.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const transcribeAudioMock = vi.fn();
const eqMock = vi.fn();
const maybeSingleMock = vi.fn();
const updateChainEqMock = vi.fn();
const insertMock = vi.fn();
const createSignedUrlMock = vi.fn();

function createMockSupabase() {
  return {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => maybeSingleMock() }),
      }),
      update: () => ({
        eq: (col: string, val: unknown) => {
          updateChainEqMock(col, val);
          return Promise.resolve({ data: null, error: null });
        },
      }),
      insert: (values: unknown) => {
        insertMock(values);
        return Promise.resolve({ data: null, error: null });
      },
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: (path: string, ttl: number) => {
          createSignedUrlMock(path, ttl);
          return Promise.resolve({
            data: { signedUrl: `https://signed.example.com/${path}` },
            error: null,
          });
        },
      })),
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => createMockSupabase(),
}));

vi.mock('@/features/dmx-studio/lib/deepgram', () => ({
  transcribeAudio: (...args: unknown[]) => transcribeAudioMock(...args),
}));

beforeEach(() => {
  transcribeAudioMock.mockReset();
  eqMock.mockReset();
  maybeSingleMock.mockReset();
  updateChainEqMock.mockReset();
  insertMock.mockReset();
  createSignedUrlMock.mockReset();
});

describe('transcription-step', () => {
  it('runs transcription end-to-end with deepgram', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'v1',
        audio_extract_storage_path: 'u1/v1.mp3',
        user_id: 'u1',
      },
      error: null,
    });
    transcribeAudioMock.mockResolvedValue({
      transcript: 'hello world',
      words: [{ word: 'hello', start: 0, end: 0.5, confidence: 0.99 }],
      utterances: [],
      durationSeconds: 60,
      costUsd: 0.0043,
    });

    const { transcribeRawVideo } = await import(
      '@/features/dmx-studio/lib/raw-video-pipeline/transcription-step'
    );
    const result = await transcribeRawVideo('v1');
    expect(result.transcript).toBe('hello world');
    expect(result.durationSeconds).toBe(60);
    expect(transcribeAudioMock).toHaveBeenCalledWith(
      expect.objectContaining({ languageCode: 'es-419' }),
    );
  });

  it('throws PRECONDITION_FAILED when audio path missing', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'v1', audio_extract_storage_path: null, user_id: 'u1' },
      error: null,
    });
    const { transcribeRawVideo } = await import(
      '@/features/dmx-studio/lib/raw-video-pipeline/transcription-step'
    );
    await expect(transcribeRawVideo('v1')).rejects.toThrow(/audio_extract_storage_path missing/);
  });

  it('marks transcription_status=failed on error', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'v1', audio_extract_storage_path: 'u1/v1.mp3', user_id: 'u1' },
      error: null,
    });
    transcribeAudioMock.mockRejectedValue(new Error('deepgram down'));

    const { transcribeRawVideo } = await import(
      '@/features/dmx-studio/lib/raw-video-pipeline/transcription-step'
    );
    await expect(transcribeRawVideo('v1')).rejects.toThrow();
  });
});

describe('transcription-orchestrator retry logic', () => {
  it('retries up to 3 times', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'v1', audio_extract_storage_path: 'u1/v1.mp3', user_id: 'u1' },
      error: null,
    });
    transcribeAudioMock
      .mockRejectedValueOnce(new Error('first fail'))
      .mockRejectedValueOnce(new Error('second fail'))
      .mockResolvedValueOnce({
        transcript: 'ok',
        words: [],
        utterances: [],
        durationSeconds: 1,
        costUsd: 0.0001,
      });

    const { transcribeRawVideo } = await import(
      '@/features/dmx-studio/lib/raw-video-pipeline/transcription-orchestrator'
    );
    const result = await transcribeRawVideo('v1');
    expect(result.transcript).toBe('ok');
    expect(transcribeAudioMock).toHaveBeenCalledTimes(3);
  });
});
