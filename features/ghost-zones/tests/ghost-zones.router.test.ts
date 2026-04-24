import { describe, expect, it } from 'vitest';

describe('ghostZonesRouter — module export smoke', () => {
  it('exports ghostZonesRouter with expected procedures', async () => {
    const mod = await import('../routes/ghost-zones');
    expect(mod.ghostZonesRouter).toBeDefined();
    const record = mod.ghostZonesRouter as unknown as Record<string, unknown>;
    expect(record.ranking).toBeDefined();
    expect(record.timeline12m).toBeDefined();
  });
});

describe('ghost-zones schemas — input validation', () => {
  it('rankingInputSchema applies defaults', async () => {
    const { rankingInputSchema } = await import('../schemas/ghost');
    const parsed = rankingInputSchema.parse({});
    expect(parsed.topN).toBe(50);
    expect(parsed.countryCode).toBe('MX');
  });

  it('rankingInputSchema rejects malformed periodDate', async () => {
    const { rankingInputSchema } = await import('../schemas/ghost');
    expect(() => rankingInputSchema.parse({ periodDate: '2026/05/01' })).toThrow();
  });

  it('rankingInputSchema rejects topN > 200', async () => {
    const { rankingInputSchema } = await import('../schemas/ghost');
    expect(() => rankingInputSchema.parse({ topN: 500 })).toThrow();
  });

  it('timelineInputSchema defaults months=12', async () => {
    const { timelineInputSchema } = await import('../schemas/ghost');
    const parsed = timelineInputSchema.parse({
      coloniaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
    expect(parsed.months).toBe(12);
  });

  it('timelineInputSchema rejects non-uuid coloniaId', async () => {
    const { timelineInputSchema } = await import('../schemas/ghost');
    expect(() => timelineInputSchema.parse({ coloniaId: 'not-a-uuid' })).toThrow();
  });

  it('timelineInputSchema rejects months outside range', async () => {
    const { timelineInputSchema } = await import('../schemas/ghost');
    expect(() =>
      timelineInputSchema.parse({
        coloniaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        months: 36,
      }),
    ).toThrow();
    expect(() =>
      timelineInputSchema.parse({
        coloniaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        months: 1,
      }),
    ).toThrow();
  });

  it('ghostZoneRankingSchema validates complete ranking object', async () => {
    const { ghostZoneRankingSchema } = await import('../schemas/ghost');
    const sample = {
      colonia_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      colonia_label: 'Roma Norte',
      country_code: 'MX',
      period_date: '2026-05-01',
      ghost_score: 72.5,
      rank: 3,
      search_volume: 8200,
      press_mentions: 210,
      score_total: 45.2,
      breakdown: {
        search_component: 82,
        press_component: 42,
        dmx_gap_component: 55,
      },
      hype_level: 'over_hyped' as const,
      hype_halving_warning: false,
      calculated_at: '2026-05-01T00:00:00Z',
    };
    expect(ghostZoneRankingSchema.parse(sample)).toBeDefined();
  });
});
