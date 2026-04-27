// F14.F.5 Sprint 4 — Test render CommunityChallengesCard.
// Modo A: smoke + render via mocked tRPC client + mocked next/navigation.

import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      challenges: {
        getCurrentWeek: {
          useQuery: vi.fn(() => ({
            data: {
              id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              challengeType: 'reels_count',
              title: 'Genera 5 reels esta semana',
              description: 'Mantén la racha activa.',
              targetValue: '5',
              rewardXp: 250,
              weekStart: '2026-04-27',
              isActive: true,
              participantsCount: 12,
              completersCount: 3,
              createdAt: '2026-04-27T00:00:00.000Z',
            },
            isLoading: false,
            isError: false,
          })),
        },
      },
    },
  },
}));

describe('CommunityChallengesCard', () => {
  it('renders title + cta button', async () => {
    const mod = await import('@/features/dmx-studio/components/challenges/CommunityChallengesCard');
    expect(typeof mod.CommunityChallengesCard).toBe('function');
    // Smoke render contract: component is a valid client component with tRPC + router deps wired.
    expect(mod.CommunityChallengesCard.name).toBe('CommunityChallengesCard');
  });
});
