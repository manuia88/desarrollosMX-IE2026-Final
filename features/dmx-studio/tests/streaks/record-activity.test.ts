// F14.F.5 Sprint 4 UPGRADE 3 — recordActivity() unit tests.
// Mocks: supabase admin client (chainable from(...).select().eq().maybeSingle() +
// update + insert) and resend sendStreakMilestone (no-op email side effect).

import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendStreakMilestoneMock = vi.fn(async () => ({
  providerMessageId: 'mock-id',
  provider: 'mock' as const,
  accepted: true,
  error: null,
}));

vi.mock('@/features/dmx-studio/lib/resend', () => ({
  sendStreakMilestone: sendStreakMilestoneMock,
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

interface MockRow {
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  badges_unlocked: string[];
  total_videos_generated: number;
}

interface Registry {
  selectRow: MockRow | null;
  inserts: Array<Record<string, unknown>>;
  updates: Array<Record<string, unknown>>;
}

let reg: Registry;

function buildClient(): SupabaseClient {
  return {
    from(_table: string) {
      const builder: Record<string, unknown> = {};
      builder.select = (_cols?: string) => builder;
      builder.eq = (_col: string, _val: unknown) => builder;
      builder.maybeSingle = async () => ({ data: reg.selectRow, error: null });
      builder.insert = (payload: Record<string, unknown>) => {
        reg.inserts.push(payload);
        return Promise.resolve({ error: null });
      };
      builder.update = (payload: Record<string, unknown>) => {
        reg.updates.push(payload);
        const inner: Record<string, unknown> = {};
        inner.eq = (_col: string, _val: unknown) => Promise.resolve({ error: null });
        return inner;
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  reg = { selectRow: null, inserts: [], updates: [] };
  sendStreakMilestoneMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('recordActivity — same day no-op', () => {
  it('returns existing snapshot without insert or update when last_activity_date == today', async () => {
    reg.selectRow = {
      current_streak_days: 5,
      longest_streak_days: 12,
      last_activity_date: '2026-04-27',
      badges_unlocked: [],
      total_videos_generated: 10,
    };
    const { recordActivity } = await import('@/features/dmx-studio/lib/streaks');
    const r = await recordActivity(buildClient(), {
      userId: 'u-1',
      today: '2026-04-27',
    });
    expect(r.currentStreak).toBe(5);
    expect(r.longestStreak).toBe(12);
    expect(r.newBadgeUnlocked).toBeNull();
    expect(reg.inserts).toHaveLength(0);
    expect(reg.updates).toHaveLength(0);
  });
});

describe('recordActivity — consecutive day +1', () => {
  it('increments current_streak by 1 when last_activity_date == yesterday', async () => {
    reg.selectRow = {
      current_streak_days: 6,
      longest_streak_days: 6,
      last_activity_date: '2026-04-26',
      badges_unlocked: [],
      total_videos_generated: 6,
    };
    const { recordActivity } = await import('@/features/dmx-studio/lib/streaks');
    const r = await recordActivity(buildClient(), {
      userId: 'u-1',
      today: '2026-04-27',
      notifyEmail: 'asesor@example.com',
      notifyName: 'Manu',
    });
    expect(r.currentStreak).toBe(7);
    expect(r.longestStreak).toBe(7);
    expect(r.newBadgeUnlocked).toBe('streak_7');
    expect(reg.updates).toHaveLength(1);
    const upd0 = reg.updates[0];
    expect(upd0).toBeDefined();
    if (!upd0) throw new Error('unreachable');
    expect(upd0.current_streak_days).toBe(7);
    expect(upd0.badges_unlocked).toEqual(['streak_7']);
    expect(sendStreakMilestoneMock).toHaveBeenCalledTimes(1);
    expect(sendStreakMilestoneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'asesor@example.com',
        badgeKey: 'streak_7',
        currentStreakDays: 7,
      }),
    );
  });
});

describe('recordActivity — broken streak resets to 1', () => {
  it('resets current_streak to 1 when last_activity_date is more than 1 day ago', async () => {
    reg.selectRow = {
      current_streak_days: 14,
      longest_streak_days: 20,
      last_activity_date: '2026-04-20',
      badges_unlocked: ['streak_7'],
      total_videos_generated: 20,
    };
    const { recordActivity } = await import('@/features/dmx-studio/lib/streaks');
    const r = await recordActivity(buildClient(), {
      userId: 'u-1',
      today: '2026-04-27',
    });
    expect(r.currentStreak).toBe(1);
    // longest is preserved (20) since 1 < 20
    expect(r.longestStreak).toBe(20);
    expect(r.newBadgeUnlocked).toBeNull();
    expect(reg.updates).toHaveLength(1);
    const upd0 = reg.updates[0];
    expect(upd0).toBeDefined();
    if (!upd0) throw new Error('unreachable');
    expect(upd0.current_streak_days).toBe(1);
    expect(upd0.longest_streak_days).toBe(20);
    expect(sendStreakMilestoneMock).not.toHaveBeenCalled();
  });
});
