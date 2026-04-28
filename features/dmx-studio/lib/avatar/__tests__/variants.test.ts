import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { generateAvatarVariants } from '../variants';

function buildClient(opts: {
  avatar?: { id: string; status: string } | null;
  brand?: { primary_color: string; secondary_color: string; logo_url: string | null } | null;
  variants: ReadonlyArray<{ id: string; style: string }>;
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_avatars') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: opts.avatar ?? null, error: null }) }),
          }),
        }),
      };
    }
    if (table === 'studio_brand_kits') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.brand ?? null, error: null }) }),
        }),
      };
    }
    if (table === 'studio_avatar_variants') {
      return {
        upsert: () => ({
          select: async () => ({ data: opts.variants, error: null }),
        }),
      };
    }
    return {};
  });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<
    typeof createAdminClient
  >);
}

describe('avatar/variants', () => {
  it('lanza NOT_FOUND si avatar no existe', async () => {
    buildClient({ avatar: null, variants: [] });
    await expect(
      generateAvatarVariants({ avatarId: 'x', userId: 'y', styles: ['formal'] }),
    ).rejects.toThrow();
  });

  it('lanza PRECONDITION_FAILED si avatar.status != ready', async () => {
    buildClient({ avatar: { id: 'av-1', status: 'pending' }, variants: [] });
    await expect(
      generateAvatarVariants({ avatarId: 'av-1', userId: 'u', styles: ['formal'] }),
    ).rejects.toThrow(/ready/);
  });

  it('genera variants y carga branding cuando style branded', async () => {
    buildClient({
      avatar: { id: 'av-1', status: 'ready' },
      brand: { primary_color: '#000', secondary_color: '#fff', logo_url: 'https://logo.png' },
      variants: [
        { id: 'v1', style: 'formal' },
        { id: 'v2', style: 'branded' },
      ],
    });
    const result = await generateAvatarVariants({
      avatarId: 'av-1',
      userId: 'u',
      styles: ['formal', 'branded'],
    });
    expect(result.variants.length).toBe(2);
    expect(result.variants.map((v) => v.style)).toContain('branded');
  });

  it('marca primer style como is_default', async () => {
    buildClient({
      avatar: { id: 'av-1', status: 'ready' },
      variants: [{ id: 'v1', style: 'casual' }],
    });
    const result = await generateAvatarVariants({
      avatarId: 'av-1',
      userId: 'u',
      styles: ['casual'],
    });
    expect(result.variants[0]?.style).toBe('casual');
  });
});
