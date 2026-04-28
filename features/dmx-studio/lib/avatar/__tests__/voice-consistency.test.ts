import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { checkVoiceConsistency } from '../voice-consistency';

function buildClient(avatar: unknown, voiceClone: unknown) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_avatars') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: avatar, error: null }) }),
        }),
      };
    }
    if (table === 'studio_voice_clones') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: voiceClone, error: null }) }),
        }),
      };
    }
    return {};
  });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<
    typeof createAdminClient
  >);
}

describe('avatar/voice-consistency', () => {
  it('returns unknown si no hay avatar', async () => {
    buildClient(null, null);
    const result = await checkVoiceConsistency('u');
    expect(result.matchLevel).toBe('unknown');
    expect(result.matchScore).toBe(0);
  });

  it('returns unknown si avatar sin linked_voice_clone_id', async () => {
    buildClient(
      {
        id: 'av-1',
        linked_voice_clone_id: null,
        quality_score: 90,
        voice_sample_storage_path: 'p',
      },
      null,
    );
    const result = await checkVoiceConsistency('u');
    expect(result.matchLevel).toBe('unknown');
    expect(result.recommendations[0]).toMatch(/voice clone/i);
  });

  it('returns high match si quality_scores altos', async () => {
    buildClient(
      {
        id: 'av-1',
        linked_voice_clone_id: 'vc-1',
        quality_score: 90,
        voice_sample_storage_path: 'p',
      },
      { quality_score: 90, status: 'ready' },
    );
    const result = await checkVoiceConsistency('u');
    expect(result.matchLevel).toBe('high');
    expect(result.matchScore).toBeGreaterThanOrEqual(0.85);
  });

  it('returns low match si quality_scores bajos', async () => {
    buildClient(
      {
        id: 'av-1',
        linked_voice_clone_id: 'vc-1',
        quality_score: 30,
        voice_sample_storage_path: 'p',
      },
      { quality_score: 30, status: 'ready' },
    );
    const result = await checkVoiceConsistency('u');
    expect(result.matchLevel).toBe('low');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
