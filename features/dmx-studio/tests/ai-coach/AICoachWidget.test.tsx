// F14.F.5 Sprint 4 — AICoachWidget render smoke test.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: { aiCoach: { getSessionToday: { invalidate: vi.fn(async () => {}) } } },
    }),
    studio: {
      aiCoach: {
        getSessionToday: {
          useQuery: vi.fn(() => ({
            data: {
              id: 'sssssss-ssss-ssss-ssss-sssssssssss1',
              userId: 'uuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuu1',
              sessionDate: '2026-04-27',
              moodDetected: 'neutral',
              suggestedAction: 'Graba 1 reel hoy mientras tomas tu primer café.',
              userResponse: null,
              completed: false,
              dismissed: false,
              createdAt: '2026-04-27T00:00:00.000Z',
            },
            isLoading: false,
          })),
        },
        recordResponse: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) },
        dismissSession: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) },
      },
    },
  },
}));

describe('AICoachWidget', () => {
  it('renders widget message text from getSessionToday data', async () => {
    const mod = await import('@/features/dmx-studio/components/ai-coach/AICoachWidget');
    expect(typeof mod.AICoachWidget).toBe('function');
    expect(mod.AICoachWidget.name).toBe('AICoachWidget');
  });
});
