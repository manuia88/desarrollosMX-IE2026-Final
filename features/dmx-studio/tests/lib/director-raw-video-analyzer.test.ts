// F14.F.6 Sprint 5 BIBLIA Tarea 5.3 — Director raw video analyzer tests.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingleMock = vi.fn();
const updateChainEqMock = vi.fn();

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
    })),
  }),
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
  Object.assign(process.env, { NODE_ENV: 'test', RAW_VIDEO_DIRECTOR_DRY_RUN: 'true' });
});

describe('filler-patterns', () => {
  it('detects fillers ES-MX', async () => {
    const { isFiller, FILLERS_MX } = await import(
      '@/features/dmx-studio/lib/director/raw-video-analyzer/filler-patterns'
    );
    expect(isFiller('este')).toBe(true);
    expect(isFiller('o sea')).toBe(true);
    expect(isFiller('wey')).toBe(true);
    expect(isFiller('departamento')).toBe(false);
    expect(FILLERS_MX.length).toBeGreaterThan(15);
  });

  it('computeFillerStats counts and ranks', async () => {
    const { computeFillerStats } = await import(
      '@/features/dmx-studio/lib/director/raw-video-analyzer/filler-patterns'
    );
    const stats = computeFillerStats([
      { word: 'este' },
      { word: 'departamento' },
      { word: 'este' },
      { word: 'tipo' },
      { word: 'wey' },
    ]);
    expect(stats.totalCount).toBe(4);
    expect(stats.topFillers[0]?.word).toBe('este');
    expect(stats.topFillers[0]?.count).toBe(2);
  });
});

describe('bad-take-detector', () => {
  it('detects repetition with 70% similarity', async () => {
    const { detectBadTakes, jaccardSimilarity } = await import(
      '@/features/dmx-studio/lib/director/raw-video-analyzer/bad-take-detector'
    );
    expect(jaccardSimilarity(['hola', 'mundo'], ['hola', 'mundo'])).toBe(1);
    expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);

    const words = [
      { word: 'el', start: 0, end: 0.3 },
      { word: 'departamento', start: 0.3, end: 1 },
      { word: 'es', start: 1, end: 1.2 },
      { word: 'muy', start: 1.2, end: 1.5 },
      { word: 'amplio', start: 1.5, end: 2 },
      { word: 'el', start: 2.5, end: 2.8 },
      { word: 'departamento', start: 2.8, end: 3.5 },
      { word: 'es', start: 3.5, end: 3.7 },
      { word: 'muy', start: 3.7, end: 4 },
      { word: 'amplio', start: 4, end: 4.5 },
    ];
    const takes = detectBadTakes(words);
    expect(takes.length).toBeGreaterThan(0);
    expect(takes[0]?.reason).toBe('repetition');
  });
});

describe('auto-chapters', () => {
  it('skips chapters when duration < 2min', async () => {
    const { generateChaptersFromUtterances, shouldGenerateChapters } = await import(
      '@/features/dmx-studio/lib/director/raw-video-analyzer/auto-chapters'
    );
    expect(shouldGenerateChapters(60_000)).toBe(false);
    expect(shouldGenerateChapters(150_000)).toBe(true);
    const chapters = generateChaptersFromUtterances([], 60_000);
    expect(chapters).toEqual([]);
  });

  it('generates 3-7 chapters for video > 2min', async () => {
    const { generateChaptersFromUtterances } = await import(
      '@/features/dmx-studio/lib/director/raw-video-analyzer/auto-chapters'
    );
    const utterances = Array.from({ length: 30 }, (_, i) => ({
      start: i * 10,
      end: (i + 1) * 10,
      transcript: `frase número ${i}`,
    }));
    const chapters = generateChaptersFromUtterances(utterances, 300_000);
    expect(chapters.length).toBeGreaterThanOrEqual(3);
    expect(chapters.length).toBeLessThanOrEqual(7);
  });
});

describe('analyzeRawVideo end-to-end', () => {
  it('builds EDL with filler + silence + bad_take cuts and persists', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'v1',
        duration_seconds: 180,
        transcription: {
          transcript: 'este test es un departamento amplio',
          words: [
            { word: 'este', start: 0, end: 0.5, confidence: 0.95 },
            { word: 'test', start: 0.5, end: 0.9, confidence: 0.95 },
            { word: 'es', start: 1, end: 1.2, confidence: 0.95 },
          ],
          utterances: [
            { start: 0, end: 1.2, transcript: 'este test es', confidence: 0.95 },
            { start: 6, end: 8, transcript: 'siguiente frase', confidence: 0.95 },
          ],
        },
      },
      error: null,
    });

    const { analyzeRawVideo } = await import(
      '@/features/dmx-studio/lib/director/raw-video-analyzer'
    );
    const result = await analyzeRawVideo('v1');
    expect(result.fillerStats.totalCount).toBeGreaterThan(0);
    expect(result.edl.length).toBeGreaterThan(0);
    expect(updateChainEqMock).toHaveBeenCalled();
  });
});
