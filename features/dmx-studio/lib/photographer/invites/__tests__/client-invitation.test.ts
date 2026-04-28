// F14.F.10 Sprint 9 SUB-AGENT 3 — client-invitation tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';

vi.mock('@/features/dmx-studio/lib/resend/provider', () => ({
  getStudioEmailProvider: vi.fn(),
}));

import { getStudioEmailProvider } from '@/features/dmx-studio/lib/resend/provider';
import {
  computeExpiresAt,
  generateReferralToken,
  INVITATION_EXPIRATION_DAYS,
  inviteClientWithVideo,
  REFERRAL_TOKEN_LENGTH,
  renderClientInviteHtml,
} from '../client-invitation';

type StudioAdminClient = SupabaseClient<Database>;

interface MockState {
  readonly photographer?: { id: string; business_name: string } | null;
  readonly video?: { id: string; storage_url: string | null; user_id: string } | null;
  readonly insertedInvite?: {
    id: string;
    referral_token: string;
    expires_at: string;
  } | null;
  readonly insertError?: Error | null;
}

function buildClient(state: MockState): StudioAdminClient {
  const fromImpl = vi.fn((table: string) => {
    if (table === 'studio_photographers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.photographer ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === 'studio_video_outputs') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.video ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === 'studio_photographer_invites') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: state.insertedInvite ?? null,
              error: state.insertError ?? null,
            }),
          }),
        }),
      };
    }
    return {};
  });
  return { from: fromImpl } as unknown as StudioAdminClient;
}

beforeEach(() => {
  vi.mocked(getStudioEmailProvider).mockReturnValue({
    name: 'mock' as const,
    send: vi.fn().mockResolvedValue({
      providerMessageId: 'mock-id-1',
      provider: 'mock' as const,
      accepted: true,
      error: null,
    }),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('photographer/invites/client-invitation', () => {
  it('generateReferralToken produce strings únicos de 32 chars', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const token = generateReferralToken();
      expect(token.length).toBe(REFERRAL_TOKEN_LENGTH);
      tokens.add(token);
    }
    expect(tokens.size).toBe(100);
  });

  it('computeExpiresAt configura ventana de 30 días desde ahora', () => {
    const now = new Date('2026-04-27T00:00:00Z');
    const expires = computeExpiresAt(now);
    const expected = new Date(
      now.getTime() + INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(expires).toBe(expected);
    expect(INVITATION_EXPIRATION_DAYS).toBe(30);
  });

  it('inviteClientWithVideo construye email con CTA y dispara provider', async () => {
    const supabase = buildClient({
      photographer: { id: 'p-1', business_name: 'Foto Studio MX' },
      video: { id: 'v-1', storage_url: 'https://cdn/v-1.mp4', user_id: 'u-1' },
      insertedInvite: {
        id: 'inv-1',
        referral_token: 'token-abc-32-chars-xxxxxxxxxxxxxxxx',
        expires_at: '2026-05-27T00:00:00Z',
      },
    });

    const sendSpy = vi.fn().mockResolvedValue({
      providerMessageId: 'mock-99',
      provider: 'mock' as const,
      accepted: true,
      error: null,
    });
    vi.mocked(getStudioEmailProvider).mockReturnValue({
      name: 'mock' as const,
      send: sendSpy,
    });

    const result = await inviteClientWithVideo(supabase, {
      photographerUserId: 'u-1',
      videoId: 'v-1',
      clientEmail: 'cliente@x.com',
      clientName: 'Manu',
    });

    expect(result.inviteId).toBe('inv-1');
    expect(result.emailAccepted).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const sentArg = sendSpy.mock.calls[0]?.[0] as { html: string; subject: string };
    expect(sentArg.subject).toContain('video');
    expect(sentArg.html).toContain('Ver video y descargar');
    expect(sentArg.html).toContain('Foto Studio MX');

    // renderClientInviteHtml produce mismo CTA reusable
    const html = renderClientInviteHtml({
      clientName: 'Manu',
      photographerBusinessName: 'Foto Studio MX',
      previewVideoUrl: 'https://cdn/v.mp4',
      acceptanceUrl: 'https://desarrollosmx.com/es-MX/studio/invite/abc',
    });
    expect(html).toContain('https://desarrollosmx.com/es-MX/studio/invite/abc');
    expect(html).toContain('linear-gradient(90deg,#6366F1,#EC4899)');
  });
});
