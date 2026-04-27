// F14.F.5 Sprint 4 — Tests getCurrentWeekChallenge.
// Modo A: pure-function tests con mocked Supabase chain. Cero red, cero credit.

import { describe, expect, it, vi } from 'vitest';
import { getCurrentWeekChallenge } from '@/features/dmx-studio/lib/community-challenges';

interface MockChallenge {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  target_value: string;
  reward_xp: number;
  week_start: string;
  is_active: boolean;
  participants_count: number;
  completers_count: number;
  created_at: string;
}

function buildSupabaseMock(challenge: MockChallenge | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: challenge, error: null })),
            })),
          })),
        })),
      })),
    })),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface
  } as any;
}

const ACTIVE: MockChallenge = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  challenge_type: 'reels_count',
  title: 'Genera 5 reels esta semana',
  description: 'Mantén la racha. 5 reels nuevos.',
  target_value: '5',
  reward_xp: 250,
  week_start: '2026-04-27',
  is_active: true,
  participants_count: 12,
  completers_count: 3,
  created_at: '2026-04-27T00:00:00.000Z',
};

describe('getCurrentWeekChallenge', () => {
  it('returns active challenge mapped to DTO when one exists', async () => {
    const supabase = buildSupabaseMock(ACTIVE);
    const result = await getCurrentWeekChallenge(supabase);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ACTIVE.id);
    expect(result?.challengeType).toBe('reels_count');
    expect(result?.weekStart).toBe('2026-04-27');
    expect(result?.participantsCount).toBe(12);
    expect(result?.rewardXp).toBe(250);
  });

  it('returns null when no active challenge exists', async () => {
    const supabase = buildSupabaseMock(null);
    const result = await getCurrentWeekChallenge(supabase);
    expect(result).toBeNull();
  });
});
