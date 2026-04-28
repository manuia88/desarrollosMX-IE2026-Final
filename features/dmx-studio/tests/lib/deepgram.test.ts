// F14.F.6 Sprint 5 BIBLIA — Deepgram REAL wrapper tests (SDK v5).
// Mock @deepgram/sdk responses. NO consume credits real (canon verify-before-spend).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const transcribeUrlMock = vi.fn();
const projectsListMock = vi.fn();

class FakeDeepgramClient {
  listen = {
    v1: {
      media: {
        transcribeUrl: (req: unknown) => transcribeUrlMock(req),
      },
    },
  };
  manage = {
    v1: {
      projects: {
        list: () => projectsListMock(),
      },
    },
  };
}

vi.mock('@deepgram/sdk', () => ({
  DeepgramClient: FakeDeepgramClient,
}));

beforeEach(async () => {
  transcribeUrlMock.mockReset();
  projectsListMock.mockReset();
  process.env.DEEPGRAM_API_KEY = 'test-key-fake';
  const { _resetDeepgramCache } = await import('@/features/dmx-studio/lib/deepgram');
  _resetDeepgramCache();
});

describe('dmx-studio/lib/deepgram REAL SDK v5', () => {
  describe('transcribeAudio', () => {
    it('returns transcript + words + utterances + cost', async () => {
      transcribeUrlMock.mockResolvedValue({
        metadata: { duration: 120 },
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: 'hola este es un departamento',
                  words: [
                    { word: 'hola', start: 0, end: 0.5, confidence: 0.99 },
                    { word: 'este', start: 0.6, end: 0.9, confidence: 0.95 },
                  ],
                },
              ],
            },
          ],
          utterances: [
            {
              start: 0,
              end: 1.5,
              transcript: 'hola este es un departamento',
              confidence: 0.97,
              words: [],
            },
          ],
        },
      });

      const { transcribeAudio } = await import('@/features/dmx-studio/lib/deepgram');
      const result = await transcribeAudio({ audioUrl: 'https://example.com/a.mp3' });

      expect(result.transcript).toBe('hola este es un departamento');
      expect(result.words).toHaveLength(2);
      expect(result.utterances).toHaveLength(1);
      expect(result.durationSeconds).toBe(120);
      expect(result.costUsd).toBeCloseTo(0.0086, 4);
    });

    it('throws TRPCError when API throws', async () => {
      transcribeUrlMock.mockRejectedValue(new Error('invalid url'));
      const { transcribeAudio } = await import('@/features/dmx-studio/lib/deepgram');
      await expect(transcribeAudio({ audioUrl: 'https://x.com/bad' })).rejects.toThrow(
        /Deepgram transcribe failed/,
      );
    });

    it('uses es-419 language by default', async () => {
      transcribeUrlMock.mockResolvedValue({ metadata: { duration: 0 }, results: { channels: [] } });
      const { transcribeAudio } = await import('@/features/dmx-studio/lib/deepgram');
      await transcribeAudio({ audioUrl: 'https://example.com/a.mp3' });

      expect(transcribeUrlMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/a.mp3',
          language: 'es-419',
          model: 'nova-3',
        }),
      );
    });
  });

  describe('detectSilences', () => {
    it('returns silences when gaps >= 2s', async () => {
      const { detectSilences } = await import('@/features/dmx-studio/lib/deepgram');
      const result = detectSilences([
        { start: 0, end: 1, transcript: 'a', confidence: 0.9, words: [] },
        { start: 4, end: 5, transcript: 'b', confidence: 0.9, words: [] },
        { start: 5.5, end: 6, transcript: 'c', confidence: 0.9, words: [] },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]?.startMs).toBe(1000);
      expect(result[0]?.endMs).toBe(4000);
      expect(result[0]?.durationMs).toBe(3000);
    });

    it('returns empty array when fewer than 2 utterances', async () => {
      const { detectSilences } = await import('@/features/dmx-studio/lib/deepgram');
      expect(detectSilences([])).toEqual([]);
      expect(
        detectSilences([{ start: 0, end: 1, transcript: 'x', confidence: 0.9, words: [] }]),
      ).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('returns ok:true when projects fetch succeeds', async () => {
      projectsListMock.mockResolvedValue({ projects: [{ project_id: 'p1', name: 'DMX' }] });
      const { testConnection } = await import('@/features/dmx-studio/lib/deepgram');
      const result = await testConnection();
      expect(result.ok).toBe(true);
      expect(result.accountActive).toBe(true);
    });

    it('returns ok:false when API key missing', async () => {
      delete process.env.DEEPGRAM_API_KEY;
      const { testConnection } = await import('@/features/dmx-studio/lib/deepgram');
      const result = await testConnection();
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('missing');
    });

    it('returns ok:false when projects.list throws', async () => {
      projectsListMock.mockRejectedValue(new Error('unauthorized'));
      const { testConnection } = await import('@/features/dmx-studio/lib/deepgram');
      const result = await testConnection();
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('unauthorized');
    });
  });
});
