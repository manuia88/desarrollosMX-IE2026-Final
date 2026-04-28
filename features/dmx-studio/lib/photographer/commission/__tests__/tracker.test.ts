// F14.F.10 Sprint 9 BIBLIA — Tests commission tracker.
// Modo A canon (memoria 27): mocks supabase, NO real DB.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { getPhotographerEarnings, trackVideoSale } from '../tracker';

interface MockState {
  client?: { id: string; total_videos_generated: number; total_revenue_attributed: number } | null;
  photographer?: { id: string; videos_generated_total: number; revenue_est_total: number } | null;
  earningsRows?: ReadonlyArray<{
    total_videos_generated: number;
    total_revenue_attributed: number;
    updated_at: string;
    last_video_at: string | null;
  }>;
}

interface UpdateCalls {
  clientUpdate: Array<Record<string, unknown>>;
  photographerUpdate: Array<Record<string, unknown>>;
}

function setupMock(state: MockState): UpdateCalls {
  const calls: UpdateCalls = { clientUpdate: [], photographerUpdate: [] };
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_photographer_clients') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.client ?? null, error: null }),
            }),
            gte: () => ({
              lte: async () => ({ data: state.earningsRows ?? [], error: null }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          calls.clientUpdate.push(payload);
          return {
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        },
      };
    }
    if (table === 'studio_photographers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.photographer ?? null, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          calls.photographerUpdate.push(payload);
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    }
    return {};
  });

  vi.mocked(createAdminClient).mockReturnValue({
    from: fromMock,
  } as unknown as ReturnType<typeof createAdminClient>);
  return calls;
}

describe('photographer/commission/tracker', () => {
  it('trackVideoSale increments client + photographer aggregations', async () => {
    const calls = setupMock({
      client: { id: 'cli-1', total_videos_generated: 2, total_revenue_attributed: 100 },
      photographer: { id: 'ph-1', videos_generated_total: 5, revenue_est_total: 500 },
    });

    const result = await trackVideoSale({
      photographerId: 'ph-1',
      clientId: 'cli-1',
      videoId: 'v-1',
      amount: 50,
    });

    expect(result.ok).toBe(true);
    expect(result.newClientVideosTotal).toBe(3);
    expect(result.newClientRevenueTotal).toBe(150);
    expect(result.newPhotographerVideosTotal).toBe(6);
    expect(result.newPhotographerRevenueTotal).toBe(550);
    expect(calls.clientUpdate.length).toBe(1);
    expect(calls.photographerUpdate.length).toBe(1);
  });

  it('getPhotographerEarnings filtra por range y agrupa por mes', async () => {
    setupMock({
      earningsRows: [
        {
          total_videos_generated: 3,
          total_revenue_attributed: 300,
          updated_at: '2026-03-15T10:00:00Z',
          last_video_at: '2026-03-15T10:00:00Z',
        },
        {
          total_videos_generated: 2,
          total_revenue_attributed: 200,
          updated_at: '2026-03-20T10:00:00Z',
          last_video_at: '2026-03-20T10:00:00Z',
        },
        {
          total_videos_generated: 1,
          total_revenue_attributed: 100,
          updated_at: '2026-04-05T10:00:00Z',
          last_video_at: '2026-04-05T10:00:00Z',
        },
      ],
    });

    const result = await getPhotographerEarnings('ph-1', {
      start: '2026-03-01',
      end: '2026-04-30',
    });

    expect(result.totalRevenueUsd).toBe(600);
    expect(result.totalVideos).toBe(6);
    expect(result.byMonth.length).toBe(2);
    expect(result.byMonth[0]?.month).toBe('2026-03');
    expect(result.byMonth[0]?.revenueUsd).toBe(500);
    expect(result.byMonth[0]?.videos).toBe(5);
    expect(result.byMonth[1]?.month).toBe('2026-04');
    expect(result.byMonth[1]?.revenueUsd).toBe(100);
  });

  it('trackVideoSale acumula multiple sales secuenciales', async () => {
    const state: MockState = {
      client: { id: 'cli-1', total_videos_generated: 0, total_revenue_attributed: 0 },
      photographer: { id: 'ph-1', videos_generated_total: 0, revenue_est_total: 0 },
    };
    setupMock(state);

    const r1 = await trackVideoSale({
      photographerId: 'ph-1',
      clientId: 'cli-1',
      videoId: 'v-1',
      amount: 50,
    });

    expect(r1.newClientVideosTotal).toBe(1);
    expect(r1.newClientRevenueTotal).toBe(50);

    state.client = { id: 'cli-1', total_videos_generated: 1, total_revenue_attributed: 50 };
    state.photographer = { id: 'ph-1', videos_generated_total: 1, revenue_est_total: 50 };
    setupMock(state);

    const r2 = await trackVideoSale({
      photographerId: 'ph-1',
      clientId: 'cli-1',
      videoId: 'v-2',
      amount: 30,
    });

    expect(r2.newClientVideosTotal).toBe(2);
    expect(r2.newClientRevenueTotal).toBe(80);
  });

  it('trackVideoSale envía updates atómicos a ambas tablas (client + photographer)', async () => {
    const calls = setupMock({
      client: { id: 'cli-1', total_videos_generated: 0, total_revenue_attributed: 0 },
      photographer: { id: 'ph-1', videos_generated_total: 0, revenue_est_total: 0 },
    });

    await trackVideoSale({
      photographerId: 'ph-1',
      clientId: 'cli-1',
      videoId: 'v-1',
      amount: 75,
    });

    expect(calls.clientUpdate[0]).toMatchObject({
      total_videos_generated: 1,
      total_revenue_attributed: 75,
    });
    expect(calls.photographerUpdate[0]).toMatchObject({
      videos_generated_total: 1,
      revenue_est_total: 75,
    });
    expect(calls.clientUpdate[0]?.last_video_at).toBeDefined();
    expect(calls.clientUpdate[0]?.updated_at).toBeDefined();
  });
});
