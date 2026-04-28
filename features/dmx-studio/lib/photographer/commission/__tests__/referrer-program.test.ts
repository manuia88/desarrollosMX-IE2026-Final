// F14.F.10 Sprint 9 BIBLIA — Tests referrer-program (LATERAL 6 commission 20%).
// Modo A canon: mocks supabase + email provider.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));
vi.mock('@/features/dmx-studio/lib/resend/provider', () => ({
  getStudioEmailProvider: vi.fn(),
}));

import { getStudioEmailProvider } from '@/features/dmx-studio/lib/resend/provider';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { __test__, processReferralAcceptance, REFERRAL_COMMISSION_PCT } from '../referrer-program';

interface InviteRow {
  id: string;
  photographer_id: string;
  invited_email: string;
  invitation_type: string;
  status: string;
  subscribed_to_pro: boolean;
  expires_at: string;
}

interface MockOpts {
  invite?: InviteRow | null;
  photographerEmail?: string;
}

interface UpdateCapture {
  payload?: Record<string, unknown>;
}

function setupMock(opts: MockOpts): UpdateCapture {
  const capture: UpdateCapture = {};
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'studio_photographer_invites') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.invite ?? null, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          capture.payload = payload;
          return { eq: async () => ({ error: null }) };
        },
      };
    }
    if (table === 'studio_photographers') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.photographerEmail ? { email: opts.photographerEmail } : null,
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });
  vi.mocked(createAdminClient).mockReturnValue({
    from: fromMock,
  } as unknown as ReturnType<typeof createAdminClient>);

  vi.mocked(getStudioEmailProvider).mockReturnValue({
    name: 'mock' as const,
    send: vi.fn().mockResolvedValue({
      providerMessageId: 'mock-1',
      provider: 'mock' as const,
      accepted: true,
      error: null,
    }),
  });

  return capture;
}

describe('photographer/commission/referrer-program', () => {
  it('REFERRAL_COMMISSION_PCT canon hardcoded 20% + calculo: 67 plan → 13.40', () => {
    expect(REFERRAL_COMMISSION_PCT).toBe(20);
    const result = __test__.calculateCommissionUsd(67);
    expect(result).toBe(13.4);
  });

  it('processReferralAcceptance valida invitation_type=referral_program (rechaza client_invite)', async () => {
    setupMock({
      invite: {
        id: 'inv-1',
        photographer_id: 'ph-1',
        invited_email: 'invitee@x.com',
        invitation_type: 'client_invite',
        status: 'pending',
        subscribed_to_pro: false,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    });

    await expect(processReferralAcceptance({ referralToken: 'tok-1' })).rejects.toThrow(
      'invalid_invitation_type',
    );
  });

  it('processReferralAcceptance escribe commission_earned_usd canon 20%', async () => {
    const capture = setupMock({
      invite: {
        id: 'inv-1',
        photographer_id: 'ph-1',
        invited_email: 'invitee@x.com',
        invitation_type: 'referral_program',
        status: 'pending',
        subscribed_to_pro: false,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      photographerEmail: 'photo@x.com',
    });

    const result = await processReferralAcceptance({ referralToken: 'tok-1' });

    expect(result.ok).toBe(true);
    expect(result.commissionEarnedUsd).toBe(13.4);
    expect(capture.payload).toMatchObject({
      subscribed_to_pro: true,
      commission_earned_usd: 13.4,
      status: 'accepted',
    });
  });
});
