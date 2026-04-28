import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/features/dmx-studio/lib/heygen', () => ({
  createAvatar: vi.fn(),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

import { createAvatar } from '@/features/dmx-studio/lib/heygen';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { startAvatarOnboarding } from '../onboarding-flow';

function mockSupabase(opts: {
  existingAvatar?: unknown;
  insertedAvatar?: unknown;
  signedUrl?: string;
}) {
  const updateBuilder = { eq: vi.fn().mockResolvedValue({ error: null }) };
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_avatars') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.existingAvatar ?? null, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: opts.insertedAvatar ?? null, error: null }),
          }),
        }),
        update: () => updateBuilder,
      };
    }
    return {};
  });
  const storageMock = {
    from: () => ({
      createSignedUrl: async () => ({
        data: { signedUrl: opts.signedUrl ?? 'https://signed.example' },
        error: null,
      }),
    }),
  };
  vi.mocked(createAdminClient).mockReturnValue({
    from: fromMock,
    storage: storageMock,
  } as unknown as ReturnType<typeof createAdminClient>);
}

describe('avatar/onboarding-flow', () => {
  it('startAvatarOnboarding crea row pending si flag desactivado', async () => {
    process.env.HEYGEN_AVATAR_ENABLED = 'false';
    mockSupabase({
      existingAvatar: null,
      insertedAvatar: { id: 'av-1', status: 'pending' },
    });
    const result = await startAvatarOnboarding(
      'user-1',
      { photoStoragePath: 'p', voiceSampleStoragePath: 'v' },
      { name: 'Manu' },
    );
    expect(result.avatarId).toBe('av-1');
    expect(result.status).toBe('pending');
    expect(result.heygenAvatarId).toBeNull();
  });

  it('startAvatarOnboarding lanza CONFLICT si ya hay avatar', async () => {
    process.env.HEYGEN_AVATAR_ENABLED = 'false';
    mockSupabase({ existingAvatar: { id: 'existing' } });
    await expect(
      startAvatarOnboarding(
        'user-1',
        { photoStoragePath: 'p', voiceSampleStoragePath: 'v' },
        { name: 'Manu' },
      ),
    ).rejects.toThrow(/Ya tienes/);
  });

  it('startAvatarOnboarding llama HeyGen si flag activado', async () => {
    process.env.HEYGEN_AVATAR_ENABLED = 'true';
    mockSupabase({
      existingAvatar: null,
      insertedAvatar: { id: 'av-2', status: 'pending' },
    });
    vi.mocked(createAvatar).mockResolvedValue({
      avatarId: 'heygen-av-99',
      status: 'ready',
    });
    const result = await startAvatarOnboarding(
      'user-2',
      { photoStoragePath: 'p', voiceSampleStoragePath: 'v' },
      { name: 'Sofi' },
    );
    expect(result.heygenAvatarId).toBe('heygen-av-99');
    expect(result.status).toBe('processing');
    process.env.HEYGEN_AVATAR_ENABLED = 'false';
  });
});
