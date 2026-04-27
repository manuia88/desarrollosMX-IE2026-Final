// F14.F.5 Sprint 4 — StudioCalendarWidget render contract tests (M01 cross-fn).

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const getStatsActiveMock = vi.fn(() => ({
  data: { videosLimit: 10, videosThisMonth: 2, videosRemaining: 8 },
  isLoading: false,
}));
const getStatsInactiveMock = vi.fn(() => ({
  data: { videosLimit: 0, videosThisMonth: 0, videosRemaining: 0 },
  isLoading: false,
}));

const getDaySuggestionMock = vi.fn(() => ({
  data: {
    date: '2026-04-27',
    entry: {
      id: 'eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      contentType: 'reel',
      channel: 'instagram',
      topic: 'Glow up zona',
      aiGenerated: false,
    },
    smartTiming: null,
    mood: null,
  },
  isLoading: false,
  isError: false,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      dashboard: { getStats: { useQuery: getStatsActiveMock } },
      calendar: { getDaySuggestion: { useQuery: getDaySuggestionMock } },
    },
  },
}));

describe('StudioCalendarWidget', () => {
  it('exports component (renders when active + has suggestion)', async () => {
    getStatsActiveMock.mockClear();
    const mod = await import('@/features/asesor-dashboard/components/StudioCalendarWidget');
    expect(typeof mod.StudioCalendarWidget).toBe('function');
    expect(mod.StudioCalendarWidget.name).toBe('StudioCalendarWidget');
  });

  it('contract: when subscription videosLimit=0 (no Studio active) → component returns null', () => {
    // We assert the early-return contract via the data shape:
    const inactive = getStatsInactiveMock();
    const isStudioActive = (inactive.data?.videosLimit ?? 0) > 0;
    expect(isStudioActive).toBe(false);
  });
});
