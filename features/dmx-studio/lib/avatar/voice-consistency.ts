// F14.F.8 Sprint 7 BIBLIA Upgrade 7 — Voice consistency check (Sprint 1 voice clone + avatar).

import { createAdminClient } from '@/shared/lib/supabase/admin';

export type VoiceMatchLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface VoiceConsistencyResult {
  readonly matchLevel: VoiceMatchLevel;
  readonly matchScore: number;
  readonly recommendations: ReadonlyArray<string>;
}

export async function checkVoiceConsistency(userId: string): Promise<VoiceConsistencyResult> {
  const supabase = createAdminClient();

  const { data: avatarRaw } = await supabase
    .from('studio_avatars')
    .select('id, voice_sample_storage_path, linked_voice_clone_id, quality_score')
    .eq('user_id', userId)
    .maybeSingle();
  const avatar = avatarRaw as {
    id: string;
    voice_sample_storage_path: string;
    linked_voice_clone_id: string | null;
    quality_score: number | null;
  } | null;
  if (!avatar) {
    return {
      matchLevel: 'unknown',
      matchScore: 0,
      recommendations: ['Crea un avatar antes de validar consistency.'],
    };
  }

  if (!avatar.linked_voice_clone_id) {
    return {
      matchLevel: 'unknown',
      matchScore: 0,
      recommendations: [
        'No hay voice clone Sprint 1 asociado. Para máxima consistency, crea un voice clone primero.',
      ],
    };
  }

  const { data: voiceCloneRaw } = await supabase
    .from('studio_voice_clones')
    .select('id, quality_score, status')
    .eq('id', avatar.linked_voice_clone_id)
    .maybeSingle();
  const voiceClone = voiceCloneRaw as { quality_score: number | null; status: string } | null;

  const avatarQuality = Number(avatar.quality_score ?? 0);
  const cloneQuality = Number(voiceClone?.quality_score ?? 0);
  const score = clamp01((avatarQuality + cloneQuality) / 200);

  const matchLevel: VoiceMatchLevel = score >= 0.85 ? 'high' : score >= 0.6 ? 'medium' : 'low';

  const recommendations: string[] = [];
  if (matchLevel === 'low') {
    recommendations.push(
      'Regraba tu voice sample con el mismo micrófono y ambiente que el voice clone Sprint 1.',
    );
    recommendations.push('Asegúrate de mantener el mismo tono y energía en ambas grabaciones.');
  }
  if (matchLevel === 'medium') {
    recommendations.push('Considera regrabar el voice sample para mejorar match score.');
  }
  if (matchLevel === 'high') {
    recommendations.push('Excelente consistency. No requiere acción.');
  }

  return {
    matchLevel,
    matchScore: Number(score.toFixed(3)),
    recommendations,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
