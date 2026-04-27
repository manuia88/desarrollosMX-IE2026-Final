// F14.F.5 Sprint 4 — Tests seedWeeklyChallenge + rotation cycle.

import { describe, expect, it, vi } from 'vitest';
import {
  pickTemplate,
  seedWeeklyChallenge,
  WEEKLY_TEMPLATES,
} from '@/features/dmx-studio/lib/community-challenges';

function buildInsertMock(captured: Record<string, unknown>) {
  return {
    from: vi.fn(() => ({
      insert: vi.fn((row: Record<string, unknown>) => {
        Object.assign(captured, row);
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
                ...row,
                participants_count: 0,
                completers_count: 0,
                created_at: '2026-04-27T00:00:00.000Z',
              },
              error: null,
            })),
          })),
        };
      }),
    })),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
  } as any;
}

describe('seedWeeklyChallenge', () => {
  it('rotation cycle: distinct weekStart values produce templates spanning all 4 challenge types', () => {
    const types = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const date = new Date(Date.UTC(2026, 0, 5 + i * 7));
      const iso = date.toISOString().slice(0, 10);
      types.add(pickTemplate(iso).challenge_type);
    }
    expect(types.size).toBe(WEEKLY_TEMPLATES.length);
  });

  it('insert payload weekStart is the value passed in (no day mutation)', async () => {
    const captured: Record<string, unknown> = {};
    const supabase = buildInsertMock(captured);
    const weekStart = '2026-04-27';
    const result = await seedWeeklyChallenge(supabase, weekStart);
    expect(captured.week_start).toBe(weekStart);
    expect(result.weekStart).toBe(weekStart);
    expect(result.isActive).toBe(true);
  });
});
