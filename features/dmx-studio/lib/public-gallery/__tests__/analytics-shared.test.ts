import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { getPublicGalleryStats } from '../analytics-shared';

function buildAwaitable<T>(value: T) {
  const promise = Promise.resolve(value);
  return Object.assign(promise, {
    eq: () => Promise.resolve(value),
  });
}

function buildClient(opts: {
  gallery?: { user_id: string; slug: string; view_count: number } | null;
  viewsCount?: number;
  leadsCount?: number;
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_public_galleries') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: opts.gallery ?? null, error: null }) }),
          }),
        }),
      };
    }
    if (table === 'studio_gallery_views_log') {
      return {
        select: () => ({
          eq: (key: string) => {
            if (key === 'asesor_slug') {
              return {
                gte: () => buildAwaitable({ count: opts.viewsCount ?? 0, error: null }),
              };
            }
            return {};
          },
        }),
      };
    }
    if (table === 'studio_referral_form_submissions') {
      return {
        select: () => ({
          eq: () => ({
            gte: async () => ({ count: opts.leadsCount ?? 0, error: null }),
          }),
        }),
      };
    }
    return {};
  });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<
    typeof createAdminClient
  >);
}

describe('public-gallery/analytics-shared', () => {
  it('returns null si galería no existe', async () => {
    buildClient({ gallery: null });
    const result = await getPublicGalleryStats('inexistente');
    expect(result).toBeNull();
  });

  it('agrega views + leads + total', async () => {
    buildClient({
      gallery: { user_id: 'u1', slug: 'manu', view_count: 1234 },
      viewsCount: 89,
      leadsCount: 4,
    });
    const result = await getPublicGalleryStats('manu');
    expect(result?.viewsLast30d).toBe(89);
    expect(result?.leadsLast30d).toBe(4);
    expect(result?.totalViewsAllTime).toBe(1234);
  });
});
