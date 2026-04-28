// F14.F.8 Sprint 7 BIBLIA Tarea 7.1 + Upgrade 1 — Avatar onboarding 30s flow.
// Sube foto frontal + voice sample 30s + INSERT studio_avatars status=pending → trigger HeyGen.

import { TRPCError } from '@trpc/server';
import { createAvatar } from '@/features/dmx-studio/lib/heygen';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface OnboardingArtifacts {
  readonly photoStoragePath: string;
  readonly voiceSampleStoragePath: string;
}

export interface OnboardingResult {
  readonly avatarId: string;
  readonly status: 'pending' | 'processing' | 'ready' | 'failed';
  readonly heygenAvatarId: string | null;
}

const PHOTO_BUCKET = 'avatar-source-photos';
const VOICE_BUCKET = 'avatar-voice-samples';

export async function startAvatarOnboarding(
  userId: string,
  artifacts: OnboardingArtifacts,
  options: { name: string; linkedVoiceCloneId?: string },
): Promise<OnboardingResult> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('studio_avatars')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Ya tienes un avatar registrado.',
    });
  }

  const { data: insertedRaw, error: insertError } = await supabase
    .from('studio_avatars')
    .insert({
      user_id: userId,
      source_photo_storage_path: artifacts.photoStoragePath,
      voice_sample_storage_path: artifacts.voiceSampleStoragePath,
      linked_voice_clone_id: options.linkedVoiceCloneId ?? null,
      status: 'pending',
    })
    .select('id, status')
    .single();
  const inserted = insertedRaw as { id: string; status: string } | null;
  if (insertError || !inserted) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertError });
  }

  if (process.env.HEYGEN_AVATAR_ENABLED === 'true') {
    try {
      const photoUrl = await getSignedUrl(PHOTO_BUCKET, artifacts.photoStoragePath);
      const voiceUrl = await getSignedUrl(VOICE_BUCKET, artifacts.voiceSampleStoragePath);
      const avatar = await createAvatar({
        photoUrl,
        voiceSampleUrl: voiceUrl,
        name: options.name,
      });
      await supabase
        .from('studio_avatars')
        .update({
          heygen_avatar_id: avatar.avatarId,
          status: avatar.status === 'ready' ? 'processing' : 'pending',
        })
        .eq('id', inserted.id);
      return {
        avatarId: inserted.id,
        status: avatar.status === 'ready' ? 'processing' : 'pending',
        heygenAvatarId: avatar.avatarId,
      };
    } catch (err) {
      sentry.captureException(err, { tags: { feature: 'dmx-studio.avatar.onboarding' } });
      await supabase
        .from('studio_avatars')
        .update({ status: 'failed', failure_reason: errMessage(err) })
        .eq('id', inserted.id);
      throw err;
    }
  }

  return {
    avatarId: inserted.id,
    status: inserted.status as OnboardingResult['status'],
    heygenAvatarId: null,
  };
}

async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }
  return data.signedUrl;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 500);
  return String(err).slice(0, 500);
}
