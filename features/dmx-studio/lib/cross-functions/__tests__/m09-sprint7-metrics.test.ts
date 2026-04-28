import { describe, expect, it, vi } from 'vitest';
import { getStudioSprint7MetricsForAsesor } from '../m09-sprint7-metrics';

function buildClient(opts: {
  avatar?: { id: string; status: string } | null;
  variantsCount?: number;
  visitsCount?: number;
  referralsCount?: number;
  zoneVideosCount?: number;
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_avatars') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.avatar ?? null, error: null }) }),
        }),
      };
    }
    if (table === 'studio_avatar_variants') {
      return {
        select: () => ({
          eq: async () => ({ count: opts.variantsCount ?? 0, error: null }),
        }),
      };
    }
    if (table === 'studio_gallery_views_log') {
      return {
        select: () => ({
          eq: () => ({
            gte: async () => ({ count: opts.visitsCount ?? 0, error: null }),
          }),
        }),
      };
    }
    if (table === 'studio_referral_form_submissions') {
      return {
        select: () => ({
          eq: () => ({
            gte: async () => ({ count: opts.referralsCount ?? 0, error: null }),
          }),
        }),
      };
    }
    if (table === 'studio_zone_videos') {
      return {
        select: () => ({
          eq: async () => ({ count: opts.zoneVideosCount ?? 0, error: null }),
        }),
      };
    }
    return {};
  });
  return { from: fromMock } as never;
}

describe('m09-sprint7-metrics', () => {
  it('returns avatarReady=false si no hay avatar', async () => {
    const client = buildClient({ avatar: null });
    const result = await getStudioSprint7MetricsForAsesor(client, 'u');
    expect(result.avatarReady).toBe(false);
    expect(result.avatarVariantsCount).toBe(0);
  });

  it('returns avatarReady=true si avatar.status=ready', async () => {
    const client = buildClient({
      avatar: { id: 'av-1', status: 'ready' },
      variantsCount: 3,
      visitsCount: 150,
      referralsCount: 5,
      zoneVideosCount: 2,
    });
    const result = await getStudioSprint7MetricsForAsesor(client, 'u');
    expect(result.avatarReady).toBe(true);
    expect(result.avatarVariantsCount).toBe(3);
    expect(result.galleryVisitsLast30d).toBe(150);
    expect(result.galleryReferralLeadsLast30d).toBe(5);
    expect(result.zoneVideosCount).toBe(2);
  });

  it('returns 0 counts si avatar=processing y sin variantes/visitas', async () => {
    const client = buildClient({
      avatar: { id: 'av-1', status: 'processing' },
    });
    const result = await getStudioSprint7MetricsForAsesor(client, 'u');
    expect(result.avatarReady).toBe(false);
    expect(result.galleryVisitsLast30d).toBe(0);
  });
});
