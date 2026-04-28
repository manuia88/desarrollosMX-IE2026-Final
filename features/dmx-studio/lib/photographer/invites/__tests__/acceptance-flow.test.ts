// F14.F.10 Sprint 9 SUB-AGENT 3 — acceptance-flow tests.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { acceptInvitation } from '../acceptance-flow';

type StudioAdminClient = SupabaseClient<Database>;

interface InviteRow {
  id: string;
  photographer_id: string;
  invitation_type: string;
  related_video_id: string | null;
  invited_email: string;
  invited_name: string | null;
  expires_at: string;
  status: string;
  accepted_at: string | null;
  opened_at: string | null;
}

interface MockState {
  readonly invite: InviteRow | null;
  readonly existingClient?: { id: string } | null;
}

function buildClient(state: MockState): StudioAdminClient {
  const fromImpl = vi.fn((table: string) => {
    if (table === 'studio_photographer_invites') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.invite, error: null }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    }
    if (table === 'studio_photographer_clients') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.existingClient ?? null, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: { id: 'client-new-1' },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });
  return { from: fromImpl } as unknown as StudioAdminClient;
}

describe('photographer/invites/acceptance-flow', () => {
  it('acepta invitación válida y crea relation cliente nueva', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = buildClient({
      invite: {
        id: 'inv-1',
        photographer_id: 'p-1',
        invitation_type: 'client_invite',
        related_video_id: 'v-1',
        invited_email: 'cliente@x.com',
        invited_name: 'Manu',
        expires_at: future,
        status: 'sent',
        accepted_at: null,
        opened_at: null,
      },
      existingClient: null,
    });
    const result = await acceptInvitation(supabase, { token: 'token-valid' });
    expect(result.inviteId).toBe('inv-1');
    expect(result.photographerId).toBe('p-1');
    expect(result.relatedVideoId).toBe('v-1');
    expect(result.invitationType).toBe('client_invite');
    expect(result.clientRelationId).toBe('client-new-1');
    expect(result.status).toBe('accepted_new');
  });

  it('rechaza token expirado con PRECONDITION_FAILED', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const supabase = buildClient({
      invite: {
        id: 'inv-2',
        photographer_id: 'p-1',
        invitation_type: 'client_invite',
        related_video_id: null,
        invited_email: 'old@x.com',
        invited_name: null,
        expires_at: past,
        status: 'sent',
        accepted_at: null,
        opened_at: null,
      },
    });
    await expect(
      acceptInvitation(supabase, { token: 'token-expired', now: new Date() }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });
});
