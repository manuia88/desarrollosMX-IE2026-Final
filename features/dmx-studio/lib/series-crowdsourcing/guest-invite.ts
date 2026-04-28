// F14.F.9 Sprint 8 BIBLIA LATERAL 8 — Guest crowdsourcing.
// Desarrolladora invita arquitecto/contratista/cliente como guest en episodios via avatar HeyGen.

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export type GuestRole = 'arquitecto' | 'contratista' | 'cliente' | 'inversionista';

export interface InviteGuestInput {
  readonly episodeId: string;
  readonly guestType: GuestRole;
  readonly guestName: string;
  readonly photoStoragePath: string;
  readonly voiceSampleStoragePath: string;
}

export interface GuestRecord {
  readonly guestType: GuestRole;
  readonly guestName: string;
  readonly photoStoragePath: string;
  readonly voiceSampleStoragePath: string;
  readonly avatarStatus: 'pending' | 'processing' | 'ready';
  readonly heygenAvatarId: string | null;
  readonly addedAt: string;
}

const HEYGEN_AVATAR_COST_USD = 0.5;

export async function inviteGuestToEpisode(
  userId: string,
  input: InviteGuestInput,
): Promise<{
  ok: true;
  guest: GuestRecord;
  costEstimateUsd: number;
}> {
  const supabase = createAdminClient();

  const { data: episodeRow } = await supabase
    .from('studio_series_episodes')
    .select('id, series_id, guest_avatars')
    .eq('id', input.episodeId)
    .maybeSingle();
  if (!episodeRow) throw new TRPCError({ code: 'NOT_FOUND', message: 'Episode not found' });

  const { data: serieRow } = await supabase
    .from('studio_series_projects')
    .select('id')
    .eq('id', episodeRow.series_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!serieRow) throw new TRPCError({ code: 'FORBIDDEN' });

  const { data: job } = await supabase
    .from('studio_api_jobs')
    .insert({
      user_id: userId,
      provider: 'heygen',
      job_type: 'guest_avatar_create',
      status: 'pending',
      estimated_cost_usd: HEYGEN_AVATAR_COST_USD,
      input_payload: {
        kind: 'series_guest_avatar',
        episode_id: input.episodeId,
        guest_type: input.guestType,
        guest_name: input.guestName,
        photo_storage_path: input.photoStoragePath,
      } as never,
    })
    .select('id')
    .single();

  const guest: GuestRecord = {
    guestType: input.guestType,
    guestName: input.guestName,
    photoStoragePath: input.photoStoragePath,
    voiceSampleStoragePath: input.voiceSampleStoragePath,
    avatarStatus: 'pending',
    heygenAvatarId: null,
    addedAt: new Date().toISOString(),
  };

  const existing = Array.isArray(episodeRow.guest_avatars)
    ? (episodeRow.guest_avatars as Array<unknown>)
    : [];
  const updatedGuests = [...existing, { ...guest, job_id: job?.id ?? null }];

  const { error: updErr } = await supabase
    .from('studio_series_episodes')
    .update({ guest_avatars: updatedGuests as never })
    .eq('id', input.episodeId);
  if (updErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updErr });

  return { ok: true, guest, costEstimateUsd: HEYGEN_AVATAR_COST_USD };
}
