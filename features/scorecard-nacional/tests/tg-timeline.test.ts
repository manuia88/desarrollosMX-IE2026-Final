import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAlpha {
  zone_id: string;
  alpha_score: number;
  detected_at: string;
}
interface FakeHeat {
  zone_id: string;
  period_date: string;
  chef_count: number;
  gallery_count: number;
  creator_count: number;
  specialty_cafe_count: number;
}

let mockAlpha: readonly FakeAlpha[] = [];
let mockHeat: readonly FakeHeat[] = [];

function createTimelineQueryBuilder(table: string) {
  const isAlpha = table === 'zone_alpha_alerts';
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    // biome-ignore lint/suspicious/noThenProperty: mock Supabase query builder must be thenable to mimic PostgREST awaitable client
    then<T>(
      onFulfilled: (value: { data: readonly (FakeAlpha | FakeHeat)[] | null; error: null }) => T,
    ) {
      const data = isAlpha ? mockAlpha : mockHeat;
      return Promise.resolve(onFulfilled({ data, error: null }));
    },
  };
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => createTimelineQueryBuilder(table)),
  })),
}));

import {
  buildStubJourney,
  buildTgTimeline,
  classifyAlphaTier,
  formatJourneyPrompt,
  identifyEarlyMovers,
} from '../lib/tg-timeline';

beforeEach(() => {
  mockAlpha = [];
  mockHeat = [];
});

describe('classifyAlphaTier', () => {
  it('classifies tiers correctly', () => {
    expect(classifyAlphaTier(90)).toBe('peaked');
    expect(classifyAlphaTier(70)).toBe('alpha');
    expect(classifyAlphaTier(50)).toBe('emerging');
    expect(classifyAlphaTier(30)).toBe('pre-alpha');
  });
});

describe('identifyEarlyMovers', () => {
  it('returns only signals before first alpha date', () => {
    const heat = [
      {
        zone_id: 'z',
        period_date: '2024-01-01',
        chef_count: 2,
        gallery_count: 0,
        creator_count: 0,
        specialty_cafe_count: 0,
      },
      {
        zone_id: 'z',
        period_date: '2024-06-01',
        chef_count: 0,
        gallery_count: 1,
        creator_count: 0,
        specialty_cafe_count: 0,
      },
      {
        zone_id: 'z',
        period_date: '2025-03-01',
        chef_count: 0,
        gallery_count: 0,
        creator_count: 3,
        specialty_cafe_count: 0,
      },
    ];
    const earlyMovers = identifyEarlyMovers(heat, '2025-01-01');
    expect(earlyMovers.length).toBe(2);
    earlyMovers.forEach((s) => {
      expect(s.date < '2025-01-01').toBe(true);
    });
    // Confirm ASC order
    expect(earlyMovers[0]?.date).toBe('2024-01-01');
    expect(earlyMovers[0]?.signal_type).toBe('chef');
    expect(earlyMovers[1]?.signal_type).toBe('gallery');
  });

  it('returns all signals when firstAlphaDate is null', () => {
    const heat = [
      {
        zone_id: 'z',
        period_date: '2024-01-01',
        chef_count: 1,
        gallery_count: 1,
        creator_count: 0,
        specialty_cafe_count: 0,
      },
    ];
    const earlyMovers = identifyEarlyMovers(heat, null);
    expect(earlyMovers.length).toBe(2);
  });

  it('ignores zero counts', () => {
    const heat = [
      {
        zone_id: 'z',
        period_date: '2024-01-01',
        chef_count: 0,
        gallery_count: 0,
        creator_count: 0,
        specialty_cafe_count: 0,
      },
    ];
    const earlyMovers = identifyEarlyMovers(heat, null);
    expect(earlyMovers).toEqual([]);
  });
});

describe('buildStubJourney', () => {
  it('produces a non-empty narrative', () => {
    const stub = buildStubJourney(
      'Roma Norte',
      [
        { period_date: '2025-01-01', alpha_score: 55, tier: 'emerging' },
        { period_date: '2025-06-01', alpha_score: 65, tier: 'alpha' },
      ],
      [{ date: '2024-06-01', signal_type: 'chef', count: 3 }],
    );
    expect(stub).toContain('Roma Norte');
    expect(stub.length).toBeGreaterThan(0);
  });
});

describe('formatJourneyPrompt', () => {
  it('includes key data points', () => {
    const prompt = formatJourneyPrompt({
      zoneLabel: 'Escandón',
      trajectory: [{ period_date: '2025-06-01', alpha_score: 65, tier: 'alpha' }],
      earlyMovers: [{ date: '2024-06-01', signal_type: 'chef', count: 3 }],
      firstAlphaDate: '2025-06-01',
    });
    expect(prompt).toContain('Escandón');
    expect(prompt).toContain('2025-06-01');
    expect(prompt).toContain('chef');
  });
});

describe('buildTgTimeline', () => {
  it('orders alpha_trajectory ASC and resolves early movers before first alpha', async () => {
    mockAlpha = [
      { zone_id: 'z1', alpha_score: 65, detected_at: '2025-06-01T00:00:00Z' },
      { zone_id: 'z1', alpha_score: 72, detected_at: '2025-12-01T00:00:00Z' },
    ];
    mockHeat = [
      {
        zone_id: 'z1',
        period_date: '2024-03-01',
        chef_count: 2,
        gallery_count: 0,
        creator_count: 0,
        specialty_cafe_count: 0,
      },
      {
        zone_id: 'z1',
        period_date: '2025-09-01',
        chef_count: 0,
        gallery_count: 2,
        creator_count: 0,
        specialty_cafe_count: 0,
      },
    ];

    const bundle = await buildTgTimeline('z1', 'MX');
    expect(bundle.zone_id).toBe('z1');
    expect(bundle.alpha_trajectory.length).toBe(2);
    for (let i = 1; i < bundle.alpha_trajectory.length; i++) {
      const prev = bundle.alpha_trajectory[i - 1]?.period_date ?? '';
      const curr = bundle.alpha_trajectory[i]?.period_date ?? '';
      expect(prev <= curr).toBe(true);
    }
    // Only the 2024-03-01 chef signal is before first alpha 2025-06-01.
    expect(bundle.early_mover_signals.length).toBe(1);
    expect(bundle.early_mover_signals[0]?.signal_type).toBe('chef');
  });

  it('calls causalHook when provided and uses its text', async () => {
    mockAlpha = [{ zone_id: 'z2', alpha_score: 70, detected_at: '2025-06-01T00:00:00Z' }];
    mockHeat = [];
    const causalHook = vi.fn().mockResolvedValue({
      text: 'CAUSAL_JOURNEY_TEXT',
      citations: ['https://dmx.com/m'],
    });
    const bundle = await buildTgTimeline('z2', 'MX', { causalHook });
    expect(causalHook).toHaveBeenCalledTimes(1);
    expect(bundle.journey_narrative_md).toBe('CAUSAL_JOURNEY_TEXT');
  });

  it('falls back to stub when causalHook rejects', async () => {
    mockAlpha = [{ zone_id: 'z3', alpha_score: 65, detected_at: '2025-06-01T00:00:00Z' }];
    mockHeat = [];
    const causalHook = vi.fn().mockRejectedValue(new Error('fail'));
    const bundle = await buildTgTimeline('z3', 'MX', { causalHook });
    expect(bundle.journey_narrative_md.length).toBeGreaterThan(0);
    expect(bundle.journey_narrative_md).toContain('z3');
  });
});
