import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAlert {
  zone_id: string;
  scope_type: string;
  country_code: string;
  alpha_score: number;
  detected_at: string;
  is_active: boolean;
  signals: unknown;
  time_to_mainstream_months: number | null;
}

let mockAlerts: readonly FakeAlert[] = [];

function createAlertQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    // biome-ignore lint/suspicious/noThenProperty: mock Supabase query builder must be thenable to mimic PostgREST awaitable client
    then<T>(onFulfilled: (value: { data: readonly FakeAlert[] | null; error: null }) => T) {
      return Promise.resolve(onFulfilled({ data: mockAlerts, error: null }));
    },
  };
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => createAlertQueryBuilder()),
  })),
}));

import {
  buildSankeyTransitionData,
  computeAlphaLifecycle,
  deriveState,
  deriveStateWithReason,
} from '../lib/alpha-lifecycle';
import type { AlphaLifecycleTransition } from '../types';

beforeEach(() => {
  mockAlerts = [];
});

describe('deriveState — deterministic windows', () => {
  it('returns emerging with insufficient_history for empty history', () => {
    expect(deriveState([])).toBe('emerging');
    const { reason } = deriveStateWithReason([]);
    expect(reason).toBe('insufficient_history');
  });

  it('returns alpha when alpha_score >=75 sustained >=65 for last 3 months', () => {
    const history = [
      { period_date: '2025-10-01', alpha_score: 72 },
      { period_date: '2025-11-01', alpha_score: 82 },
      { period_date: '2025-12-01', alpha_score: 85 },
      { period_date: '2026-01-01', alpha_score: 88 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('alpha');
    const { reason } = deriveStateWithReason(history, '2026-02-01');
    expect(reason).toMatch(/sustained/);
  });

  it('returns peaked when alpha_score falls >=15pts from historical peak', () => {
    const history = [
      { period_date: '2025-06-01', alpha_score: 70 },
      { period_date: '2025-08-01', alpha_score: 85 },
      { period_date: '2025-10-01', alpha_score: 82 },
      { period_date: '2025-12-01', alpha_score: 68 },
      { period_date: '2026-01-01', alpha_score: 62 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('peaked');
    const { reason } = deriveStateWithReason(history, '2026-02-01');
    expect(reason).toMatch(/dropped/);
  });

  it('returns emerging when detected <6m ago with alpha_score >=50', () => {
    const history = [
      { period_date: '2025-12-01', alpha_score: 51 },
      { period_date: '2026-01-01', alpha_score: 55 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('emerging');
    const { reason } = deriveStateWithReason(history, '2026-02-01');
    expect(reason).toMatch(/detected|emerging band/);
  });

  it('returns matured when alpha_score 50-70 stable + >18 months from emerging', () => {
    const history = [
      { period_date: '2024-01-01', alpha_score: 55 },
      { period_date: '2024-07-01', alpha_score: 58 },
      { period_date: '2025-01-01', alpha_score: 56 },
      { period_date: '2025-07-01', alpha_score: 59 },
      { period_date: '2026-01-01', alpha_score: 57 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('matured');
    const { reason } = deriveStateWithReason(history, '2026-02-01');
    expect(reason).toMatch(/stable/);
  });

  it('returns declining when alpha_score drops >=25% from peak', () => {
    const history = [
      { period_date: '2024-01-01', alpha_score: 78 },
      { period_date: '2025-01-01', alpha_score: 55 },
      { period_date: '2026-01-01', alpha_score: 32 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('declining');
    const { reason } = deriveStateWithReason(history, '2026-02-01');
    expect(reason).toMatch(/dropped from/);
  });

  it('degrade graceful: single-point history returns emerging with non-empty reason', () => {
    const history = [{ period_date: '2026-01-01', alpha_score: 55 }];
    const derived = deriveStateWithReason(history, '2026-02-01');
    expect(derived.state).toBe('emerging');
    expect(derived.reason.length).toBeGreaterThan(0);
  });

  it('every transition reason returned is a non-empty string', () => {
    const fixtures: ReadonlyArray<ReadonlyArray<{ period_date: string; alpha_score: number }>> = [
      [],
      [{ period_date: '2026-01-01', alpha_score: 55 }],
      [
        { period_date: '2025-10-01', alpha_score: 80 },
        { period_date: '2025-11-01', alpha_score: 82 },
        { period_date: '2025-12-01', alpha_score: 85 },
      ],
      [
        { period_date: '2024-01-01', alpha_score: 78 },
        { period_date: '2026-01-01', alpha_score: 30 },
      ],
    ];
    for (const h of fixtures) {
      const { reason } = deriveStateWithReason(h, '2026-02-01');
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(0);
    }
  });
});

describe('buildSankeyTransitionData', () => {
  it('produces valid {nodes, links} structure', () => {
    const transitions: AlphaLifecycleTransition[] = [
      {
        zone_id: 'a',
        zone_label: 'A',
        from_state: 'emerging',
        to_state: 'alpha',
        detected_at: '2026-01-01',
        alpha_score_at_transition: 65,
        reason: 'score crossed alpha threshold',
      },
      {
        zone_id: 'b',
        zone_label: 'B',
        from_state: 'alpha',
        to_state: 'peaked',
        detected_at: '2026-01-05',
        alpha_score_at_transition: 82,
        reason: 'peak detected then cooled',
      },
      {
        zone_id: 'c',
        zone_label: 'C',
        from_state: 'emerging',
        to_state: 'alpha',
        detected_at: '2026-01-10',
        alpha_score_at_transition: 68,
        reason: 'score crossed alpha threshold',
      },
    ];
    const sankey = buildSankeyTransitionData(transitions);
    expect(sankey.nodes.length).toBeGreaterThan(0);
    expect(sankey.links.length).toBeGreaterThan(0);
    const nodeIds = new Set(sankey.nodes.map((n) => n.id));
    expect(nodeIds.has('emerging')).toBe(true);
    expect(nodeIds.has('alpha')).toBe(true);
    expect(nodeIds.has('peaked')).toBe(true);

    const aggregated = sankey.links.find((l) => l.source === 'emerging' && l.target === 'alpha');
    expect(aggregated?.value).toBe(2);
  });

  it('handles null from_state', () => {
    const transitions: AlphaLifecycleTransition[] = [
      {
        zone_id: 'a',
        zone_label: 'A',
        from_state: null,
        to_state: 'emerging',
        detected_at: '2026-01-01',
        alpha_score_at_transition: 42,
        reason: 'first detection',
      },
    ];
    const sankey = buildSankeyTransitionData(transitions);
    expect(sankey.nodes.some((n) => n.id === 'null')).toBe(true);
    expect(sankey.links[0]?.source).toBe('null');
  });
});

describe('computeAlphaLifecycle', () => {
  it('aggregates counts_by_state from 5 synthetic zones', async () => {
    mockAlerts = [
      // Zone 1 — alpha (last >=75 sustained >=65 recent)
      {
        zone_id: 'z1',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 70,
        detected_at: '2025-10-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 12,
      },
      {
        zone_id: 'z1',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 75,
        detected_at: '2025-12-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 11,
      },
      {
        zone_id: 'z1',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 80,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 10,
      },
      // Zone 2 — peaked (peaked then dropped >=15 pts)
      {
        zone_id: 'z2',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 70,
        detected_at: '2025-07-01T00:00:00Z',
        is_active: true,
        signals: ['gallery'],
        time_to_mainstream_months: 9,
      },
      {
        zone_id: 'z2',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 86,
        detected_at: '2025-10-01T00:00:00Z',
        is_active: true,
        signals: ['gallery'],
        time_to_mainstream_months: 6,
      },
      {
        zone_id: 'z2',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 78,
        detected_at: '2025-12-01T00:00:00Z',
        is_active: true,
        signals: ['gallery'],
        time_to_mainstream_months: 5,
      },
      {
        zone_id: 'z2',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 62,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: ['gallery'],
        time_to_mainstream_months: 5,
      },
      // Zone 3 — emerging
      {
        zone_id: 'z3',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 48,
        detected_at: '2025-11-01T00:00:00Z',
        is_active: true,
        signals: ['creator'],
        time_to_mainstream_months: 18,
      },
      {
        zone_id: 'z3',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 52,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: ['creator'],
        time_to_mainstream_months: 16,
      },
      // Zone 4 — declining (<40 after peak >60)
      {
        zone_id: 'z4',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 70,
        detected_at: '2023-06-01T00:00:00Z',
        is_active: false,
        signals: ['chef', 'gallery'],
        time_to_mainstream_months: null,
      },
      {
        zone_id: 'z4',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 35,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: false,
        signals: ['chef'],
        time_to_mainstream_months: null,
      },
      // Zone 5 — matured (40-60, >24 months from first)
      {
        zone_id: 'z5',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 55,
        detected_at: '2022-01-01T00:00:00Z',
        is_active: true,
        signals: ['specialty_cafe'],
        time_to_mainstream_months: null,
      },
      {
        zone_id: 'z5',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 50,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: ['specialty_cafe'],
        time_to_mainstream_months: null,
      },
    ];

    const summary = await computeAlphaLifecycle('MX', '2026-03-01');
    const counts = summary.counts_by_state;
    const total =
      counts.emerging + counts.alpha + counts.peaked + counts.matured + counts.declining;
    expect(total).toBe(5);
    expect(counts.alpha).toBeGreaterThanOrEqual(1);
    expect(counts.peaked).toBeGreaterThanOrEqual(1);
    expect(summary.case_studies.length).toBeGreaterThan(0);
    expect(summary.case_studies.length).toBeLessThanOrEqual(5);
  });

  it('invokes storyHook when provided', async () => {
    mockAlerts = [
      {
        zone_id: 'zx',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 82,
        detected_at: '2025-11-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 6,
      },
      {
        zone_id: 'zx',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 88,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 5,
      },
    ];
    const storyHook = vi.fn().mockResolvedValue('hook narrative');
    const summary = await computeAlphaLifecycle('MX', '2026-03-01', {
      includeCaseStudies: true,
      caseStudyLimit: 3,
      storyHook,
    });
    expect(storyHook).toHaveBeenCalled();
    expect(summary.case_studies[0]?.story_md).toBe('hook narrative');
  });

  it('skips case_studies when includeCaseStudies=false', async () => {
    mockAlerts = [
      {
        zone_id: 'zx',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 82,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: [],
        time_to_mainstream_months: null,
      },
    ];
    const summary = await computeAlphaLifecycle('MX', '2026-03-01', {
      includeCaseStudies: false,
    });
    expect(summary.case_studies).toEqual([]);
  });
});
