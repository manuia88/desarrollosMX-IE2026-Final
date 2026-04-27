// F14.F.5 Sprint 4 — M09 Studio metrics aggregation test.

import { describe, expect, it, vi } from 'vitest';
import { getStudioMetricsForAsesor } from '@/features/dmx-studio/lib/cross-functions/m09-studio-metrics';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function buildSupabaseMock() {
  return {
    from(table: string) {
      if (table === 'studio_streaks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  current_streak_days: 7,
                  longest_streak_days: 21,
                  total_videos_generated: 34,
                },
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'studio_remarketing_jobs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ count: 5, error: null })),
            })),
          })),
        };
      }
      if (table === 'studio_challenge_participations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(async () => ({ count: 3, error: null })),
            })),
          })),
        };
      }
      return {};
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
  } as any;
}

describe('getStudioMetricsForAsesor', () => {
  it('aggregates streaks + remarketing count + challenges completed correctly', async () => {
    const supabase = buildSupabaseMock();
    const result = await getStudioMetricsForAsesor(supabase, USER_ID);
    expect(result.streakCurrentDays).toBe(7);
    expect(result.streakLongestDays).toBe(21);
    expect(result.totalVideosGenerated).toBe(34);
    expect(result.remarketingAutoCount).toBe(5);
    expect(result.challengesCompletedCount).toBe(3);
  });
});
