import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { buildAnalyticsReportData } from '../index';

function buildClient(opts: {
  profile?: { display_name: string } | null;
  projects: ReadonlyArray<unknown>;
  outputs: ReadonlyArray<{ format: string }>;
  feedbacksHook: ReadonlyArray<{ selected_hook: string }>;
  usage: ReadonlyArray<{ cost_usd: number }>;
  feedbacks: ReadonlyArray<{ rating: number }>;
  referrals?: number;
  views?: number;
}) {
  const headSelectMaker = (count: number | null) => () => ({
    eq: () => ({
      gte: async () => ({ count, error: null }),
    }),
  });
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.profile ?? null, error: null }) }),
        }),
      };
    }
    if (table === 'studio_video_projects') {
      return {
        select: () => ({
          eq: () => ({ gte: async () => ({ data: opts.projects, error: null }) }),
        }),
      };
    }
    if (table === 'studio_video_outputs') {
      return {
        select: () => ({
          eq: () => ({ gte: async () => ({ data: opts.outputs, error: null }) }),
        }),
      };
    }
    if (table === 'studio_usage_logs') {
      return {
        select: () => ({
          eq: () => ({ gte: async () => ({ data: opts.usage, error: null }) }),
        }),
      };
    }
    if (table === 'studio_feedback') {
      return {
        select: (cols: string) => {
          if (cols.includes('selected_hook')) {
            return {
              eq: () => ({ gte: async () => ({ data: opts.feedbacksHook, error: null }) }),
            };
          }
          return { eq: () => ({ gte: async () => ({ data: opts.feedbacks, error: null }) }) };
        },
      };
    }
    if (table === 'studio_referral_form_submissions') {
      return { select: headSelectMaker(opts.referrals ?? 0) };
    }
    if (table === 'studio_gallery_views_log') {
      return { select: headSelectMaker(opts.views ?? 0) };
    }
    return {};
  });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<
    typeof createAdminClient
  >);
}

describe('pdf-export/buildAnalyticsReportData', () => {
  it('agrega KPIs correctamente', async () => {
    buildClient({
      profile: { display_name: 'Manu Acosta' },
      projects: [{}, {}, {}],
      outputs: [{ format: '9x16' }, { format: '9x16' }, { format: '1x1' }],
      feedbacksHook: [{ selected_hook: 'hook_a' }, { selected_hook: 'hook_b' }],
      usage: [{ cost_usd: 1.25 }, { cost_usd: 0.5 }],
      feedbacks: [{ rating: 5 }, { rating: 4 }],
      referrals: 8,
      views: 150,
    });
    const result = await buildAnalyticsReportData({ userId: 'u', monthsBack: 1 });
    expect(result.userName).toBe('Manu Acosta');
    expect(result.totalProjects).toBe(3);
    expect(result.totalRendered).toBe(3);
    expect(result.totalCostsUsd).toBeCloseTo(1.75, 2);
    expect(result.totalReferrals).toBe(8);
    expect(result.viewsTotal).toBe(150);
    expect(result.avgRating).toBe(4.5);
  });

  it('avgRating es null si no hay feedbacks', async () => {
    buildClient({
      profile: null,
      projects: [],
      outputs: [],
      feedbacksHook: [],
      usage: [],
      feedbacks: [],
      referrals: 0,
      views: 0,
    });
    const result = await buildAnalyticsReportData({ userId: 'u', monthsBack: 1 });
    expect(result.avgRating).toBeNull();
    expect(result.userName).toBe('Asesor DMX');
  });

  it('hookBreakdown agrupa por hook + format', async () => {
    buildClient({
      profile: null,
      projects: [],
      outputs: [{ format: '9x16' }, { format: '9x16' }, { format: '1x1' }],
      feedbacksHook: [
        { selected_hook: 'hook_a' },
        { selected_hook: 'hook_a' },
        { selected_hook: 'hook_b' },
      ],
      usage: [],
      feedbacks: [],
    });
    const result = await buildAnalyticsReportData({ userId: 'u', monthsBack: 1 });
    expect(result.hookBreakdown.length).toBe(2);
    expect(result.hookBreakdown.find((h) => h.hook === 'hook_a')?.count).toBe(2);
    expect(result.formatBreakdown.length).toBe(2);
  });
});
