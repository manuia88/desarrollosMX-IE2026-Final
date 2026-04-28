// F14.F.10 Sprint 9 BIBLIA — Invitation acceptance flow.
// Validates referral_token + expiration, marca invite accepted, upserta
// studio_photographer_clients (relation_status='active'), pre-fill profiles
// si user nuevo.
//
// STUB ADR-018 — Auth user creation activable L-NEW-PHOTOGRAPHER-INVITE-AUTH-CREATE:
// Si user no existe en auth.users, se debe crear via supabase.auth.admin.createUser
// + magic link. H1 marca invite accepted + upserta studio_photographer_clients
// con client_user_id=null para que cliente complete signup propio (canon zero
// gasto previa).

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { Database } from '@/shared/types/database';

type StudioAdminClient = SupabaseClient<Database>;

export interface AcceptInvitationInput {
  readonly token: string;
  readonly now?: Date;
}

export interface AcceptInvitationResult {
  readonly inviteId: string;
  readonly photographerId: string;
  readonly invitationType: string;
  readonly relatedVideoId: string | null;
  readonly clientEmail: string;
  readonly clientRelationId: string | null;
  readonly status: 'accepted_existing' | 'accepted_new';
}

interface InviteRow {
  readonly id: string;
  readonly photographer_id: string;
  readonly invitation_type: string;
  readonly related_video_id: string | null;
  readonly invited_email: string;
  readonly invited_name: string | null;
  readonly expires_at: string;
  readonly status: string;
  readonly accepted_at: string | null;
  readonly opened_at: string | null;
}

async function fetchInvite(supabase: StudioAdminClient, token: string): Promise<InviteRow | null> {
  const { data, error } = await supabase
    .from('studio_photographer_invites')
    .select(
      'id, photographer_id, invitation_type, related_video_id, invited_email, invited_name, expires_at, status, accepted_at, opened_at',
    )
    .eq('referral_token', token)
    .maybeSingle();
  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }
  return (data as InviteRow | null) ?? null;
}

function isExpired(expiresAtIso: string, now: Date): boolean {
  const expiresAt = new Date(expiresAtIso);
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < now.getTime();
}

async function upsertClientRelation(
  supabase: StudioAdminClient,
  photographerId: string,
  email: string,
  name: string | null,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('studio_photographer_clients')
    .select('id')
    .eq('photographer_id', photographerId)
    .eq('client_email', email)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('studio_photographer_clients')
      .update({ relation_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: updateError.message,
        cause: updateError,
      });
    }
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('studio_photographer_clients')
    .insert({
      photographer_id: photographerId,
      client_email: email,
      client_name: name,
      relation_status: 'active',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: insertError?.message ?? 'client_relation_insert_failed',
      cause: insertError ?? undefined,
    });
  }
  return inserted.id;
}

export async function acceptInvitation(
  supabase: StudioAdminClient,
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
  const now = input.now ?? new Date();
  const invite = await fetchInvite(supabase, input.token);
  if (!invite) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'invitation_not_found' });
  }
  if (isExpired(invite.expires_at, now)) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'invitation_expired' });
  }

  const wasAlreadyAccepted = invite.status === 'accepted';

  const { error: updateError } = await supabase
    .from('studio_photographer_invites')
    .update({
      status: 'accepted',
      accepted_at: invite.accepted_at ?? now.toISOString(),
      opened_at: invite.opened_at ?? now.toISOString(),
    })
    .eq('id', invite.id);

  if (updateError) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: updateError.message,
      cause: updateError,
    });
  }

  const clientRelationId = await upsertClientRelation(
    supabase,
    invite.photographer_id,
    invite.invited_email,
    invite.invited_name,
  );

  return {
    inviteId: invite.id,
    photographerId: invite.photographer_id,
    invitationType: invite.invitation_type,
    relatedVideoId: invite.related_video_id,
    clientEmail: invite.invited_email,
    clientRelationId,
    status: wasAlreadyAccepted ? 'accepted_existing' : 'accepted_new',
  };
}
