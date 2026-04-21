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
} from '../lib/alpha-lifecycle';
import type { AlphaLifecycleTransition } from '../types';

beforeEach(() => {
  mockAlerts = [];
});

describe('deriveState', () => {
  it('returns emerging for empty history', () => {
    expect(deriveState([])).toBe('emerging');
  });

  it('returns peaked when recent scores stay above 80', () => {
    const history = [
      { period_date: '2025-10-01', alpha_score: 72 },
      { period_date: '2025-11-01', alpha_score: 82 },
      { period_date: '2025-12-01', alpha_score: 85 },
      { period_date: '2026-01-01', alpha_score: 88 },
    ];
    expect(deriveState(history)).toBe('peaked');
  });

  it('returns alpha when last_score >=60 within 24 months', () => {
    const history = [
      { period_date: '2025-06-01', alpha_score: 55 },
      { period_date: '2026-01-01', alpha_score: 72 },
    ];
    expect(deriveState(history, '2026-03-01')).toBe('alpha');
  });

  it('returns emerging when last_score 40-59', () => {
    const history = [
      { period_date: '2025-09-01', alpha_score: 42 },
      { period_date: '2026-01-01', alpha_score: 51 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('emerging');
  });

  it('returns matured when score 40-60 and >24 months from first detected', () => {
    const history = [
      { period_date: '2022-01-01', alpha_score: 55 },
      { period_date: '2023-01-01', alpha_score: 58 },
      { period_date: '2026-01-01', alpha_score: 48 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('matured');
  });

  it('returns declining when last_score <40 after peak >60', () => {
    const history = [
      { period_date: '2024-01-01', alpha_score: 78 },
      { period_date: '2025-01-01', alpha_score: 55 },
      { period_date: '2026-01-01', alpha_score: 32 },
    ];
    expect(deriveState(history, '2026-02-01')).toBe('declining');
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
      },
      {
        zone_id: 'b',
        zone_label: 'B',
        from_state: 'alpha',
        to_state: 'peaked',
        detected_at: '2026-01-05',
        alpha_score_at_transition: 82,
      },
      {
        zone_id: 'c',
        zone_label: 'C',
        from_state: 'emerging',
        to_state: 'alpha',
        detected_at: '2026-01-10',
        alpha_score_at_transition: 68,
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
      // Zone 1 — alpha (last >=60, within 24m)
      {
        zone_id: 'z1',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 65,
        detected_at: '2025-10-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 12,
      },
      {
        zone_id: 'z1',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 70,
        detected_at: '2026-02-01T00:00:00Z',
        is_active: true,
        signals: ['chef'],
        time_to_mainstream_months: 10,
      },
      // Zone 2 — peaked (scores >80 recent)
      {
        zone_id: 'z2',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 83,
        detected_at: '2025-11-01T00:00:00Z',
        is_active: true,
        signals: ['gallery'],
        time_to_mainstream_months: 6,
      },
      {
        zone_id: 'z2',
        scope_type: 'colonia',
        country_code: 'MX',
        alpha_score: 86,
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
