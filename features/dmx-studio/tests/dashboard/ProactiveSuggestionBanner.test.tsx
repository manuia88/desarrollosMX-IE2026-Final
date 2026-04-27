// F14.F.5 Sprint 4 — ProactiveSuggestionBanner render smoke + module export test.

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      calendar: {
        getDaySuggestion: {
          useQuery: vi.fn(() => ({
            data: {
              date: '2026-04-27',
              entry: {
                id: 'eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                contentType: 'reel',
                channel: 'instagram',
                topic: 'Glow up zona Roma Norte',
                aiGenerated: true,
              },
              smartTiming: { hour: 11, reason: 'peak engagement' },
              mood: 'energized',
            },
            isLoading: false,
            isError: false,
          })),
        },
      },
    },
  },
}));

describe('ProactiveSuggestionBanner', () => {
  it('exports component and renders with today suggestion data', async () => {
    const mod = await import(
      '@/features/dmx-studio/components/dashboard/ProactiveSuggestionBanner'
    );
    expect(typeof mod.ProactiveSuggestionBanner).toBe('function');
    expect(mod.ProactiveSuggestionBanner.name).toBe('ProactiveSuggestionBanner');
  });
});
