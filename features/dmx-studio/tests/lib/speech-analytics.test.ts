// F14.F.6 Sprint 5 BIBLIA LATERAL 6+7 — Speech analytics tests.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingleMock = vi.fn();
const upsertResolveMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => maybeSingleMock() }) }),
      upsert: () => upsertResolveMock(),
    })),
  }),
}));

beforeEach(() => {
  maybeSingleMock.mockReset();
  upsertResolveMock.mockReset();
  upsertResolveMock.mockResolvedValue({ data: null, error: null });
});

describe('benchmarks', () => {
  it('exports TOP_INMOBILIARIO_BENCHMARKS canon', async () => {
    const { TOP_INMOBILIARIO_BENCHMARKS } = await import(
      '@/features/dmx-studio/lib/speech-analytics/benchmarks'
    );
    expect(TOP_INMOBILIARIO_BENCHMARKS.wpmTopMin).toBe(160);
    expect(TOP_INMOBILIARIO_BENCHMARKS.wpmTopMax).toBe(180);
    expect(TOP_INMOBILIARIO_BENCHMARKS.fillerRatioMaxPct).toBe(2);
    expect(TOP_INMOBILIARIO_BENCHMARKS.clarityScoreMin).toBe(80);
  });

  it('compareToBenchmarks returns optimal/low/high tiers', async () => {
    const { compareToBenchmarks } = await import(
      '@/features/dmx-studio/lib/speech-analytics/benchmarks'
    );
    const opt = compareToBenchmarks({
      words_per_minute: 170,
      filler_ratio_pct: 1.5,
      clarity_score: 85,
    });
    expect(opt.wpm.tier).toBe('optimal');
    expect(opt.filler.tier).toBe('optimal');
    expect(opt.clarity.tier).toBe('optimal');

    const low = compareToBenchmarks({
      words_per_minute: 100,
      filler_ratio_pct: 5,
      clarity_score: 50,
    });
    expect(low.wpm.tier).toBe('low');
    expect(low.filler.tier).toBe('high');
    expect(low.clarity.tier).toBe('low');
  });
});

describe('calculator', () => {
  it('calculates WPM + filler ratio + clarity score', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'v1',
        user_id: 'u1',
        duration_seconds: 60,
        transcription: {
          words: [
            { word: 'hola', start: 0, end: 0.3 },
            { word: 'este', start: 0.3, end: 0.6 },
            { word: 'departamento', start: 0.6, end: 1 },
          ],
          utterances: [
            { start: 0, end: 1, transcript: 'hola este departamento', confidence: 0.95 },
          ],
        },
        edl: [{ reason: 'bad_take' }],
      },
      error: null,
    });
    const { calculateAnalytics } = await import(
      '@/features/dmx-studio/lib/speech-analytics/calculator'
    );
    const result = await calculateAnalytics({ rawVideoId: 'v1', userId: 'u1' });
    expect(result.wpm).toBeGreaterThan(0);
    expect(result.fillerCount).toBe(1);
    expect(result.fillerRatioPct).toBeGreaterThan(0);
    expect(result.badTakesCount).toBe(1);
    expect(result.clarityScore).toBeGreaterThanOrEqual(0);
    expect(result.clarityScore).toBeLessThanOrEqual(100);
  });
});
