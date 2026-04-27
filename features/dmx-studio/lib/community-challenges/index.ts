// F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio community challenges (Strava Segments).
// Owned por sub-agent 5. Pure functions: getCurrentWeekChallenge + participateInChallenge
// + markCompleted + seedWeeklyChallenge. Modo A test-friendly (Supabase typed por callsite).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ChallengeDTO, ChallengeType, LeaderboardRowDTO, ParticipationDTO } from './types';

export type AdminSupabase = SupabaseClient<Database>;

interface ChallengeRow {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  target_value: string;
  reward_xp: number;
  week_start: string;
  is_active: boolean;
  participants_count: number;
  completers_count: number;
  created_at: string;
}

function rowToDto(row: ChallengeRow): ChallengeDTO {
  return {
    id: row.id,
    challengeType: row.challenge_type as ChallengeType,
    title: row.title,
    description: row.description,
    targetValue: row.target_value,
    rewardXp: row.reward_xp,
    weekStart: row.week_start,
    isActive: row.is_active,
    participantsCount: row.participants_count,
    completersCount: row.completers_count,
    createdAt: row.created_at,
  };
}

export async function getCurrentWeekChallenge(
  supabase: AdminSupabase,
): Promise<ChallengeDTO | null> {
  const { data, error } = await supabase
    .from('studio_community_challenges')
    .select(
      'id, challenge_type, title, description, target_value, reward_xp, week_start, is_active, participants_count, completers_count, created_at',
    )
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`getCurrentWeekChallenge failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToDto(data as ChallengeRow);
}

export async function participateInChallenge(
  supabase: AdminSupabase,
  challengeId: string,
  userId: string,
  projectId: string | null = null,
): Promise<ParticipationDTO> {
  const insertResp = await supabase
    .from('studio_challenge_participations')
    .insert({
      challenge_id: challengeId,
      user_id: userId,
      project_id: projectId,
    })
    .select('id, challenge_id, user_id, project_id, completed_at, created_at')
    .single();
  if (insertResp.error || !insertResp.data) {
    throw new Error(
      `participateInChallenge insert failed: ${insertResp.error?.message ?? 'no data'}`,
    );
  }

  const challengeResp = await supabase
    .from('studio_community_challenges')
    .select('participants_count')
    .eq('id', challengeId)
    .maybeSingle();
  const currentCount = challengeResp.data?.participants_count ?? 0;
  const updateResp = await supabase
    .from('studio_community_challenges')
    .update({ participants_count: currentCount + 1 })
    .eq('id', challengeId);
  if (updateResp.error) {
    throw new Error(`participateInChallenge increment failed: ${updateResp.error.message}`);
  }

  const row = insertResp.data;
  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    projectId: row.project_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function markCompleted(
  supabase: AdminSupabase,
  participationId: string,
): Promise<ParticipationDTO> {
  const completedAt = new Date().toISOString();
  const updateResp = await supabase
    .from('studio_challenge_participations')
    .update({ completed_at: completedAt })
    .eq('id', participationId)
    .select('id, challenge_id, user_id, project_id, completed_at, created_at')
    .single();
  if (updateResp.error || !updateResp.data) {
    throw new Error(`markCompleted update failed: ${updateResp.error?.message ?? 'no data'}`);
  }
  const challengeId = updateResp.data.challenge_id;
  const challengeResp = await supabase
    .from('studio_community_challenges')
    .select('completers_count')
    .eq('id', challengeId)
    .maybeSingle();
  const currentCount = challengeResp.data?.completers_count ?? 0;
  const incResp = await supabase
    .from('studio_community_challenges')
    .update({ completers_count: currentCount + 1 })
    .eq('id', challengeId);
  if (incResp.error) {
    throw new Error(`markCompleted increment failed: ${incResp.error.message}`);
  }
  const row = updateResp.data;
  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    projectId: row.project_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

interface ChallengeTemplate {
  readonly challenge_type: ChallengeType;
  readonly title: string;
  readonly description: string;
  readonly target_value: string;
  readonly reward_xp: number;
}

const WEEKLY_TEMPLATES: ReadonlyArray<ChallengeTemplate> = [
  {
    challenge_type: 'reels_count',
    title: 'Genera 5 reels esta semana',
    description: 'Publica al menos 5 reels nuevos. Mantén el ritmo y desbloquea badge.',
    target_value: '5',
    reward_xp: 250,
  },
  {
    challenge_type: 'platform_focus',
    title: 'Domina TikTok 7 días',
    description: 'Publica un video diario optimizado para TikTok formato vertical 9:16.',
    target_value: 'tiktok',
    reward_xp: 300,
  },
  {
    challenge_type: 'style_focus',
    title: 'Reto estilo cinematográfico',
    description: 'Crea videos con plantilla cinematic premium. Eleva calidad visual.',
    target_value: 'cinematic',
    reward_xp: 200,
  },
  {
    challenge_type: 'theme_focus',
    title: 'Semana familiar',
    description: 'Enfocate en propiedades familiares. Story narrativa hogar y comunidad.',
    target_value: 'family',
    reward_xp: 200,
  },
];

function pickTemplate(weekStart: string): ChallengeTemplate {
  const t = new Date(weekStart);
  const fallback = WEEKLY_TEMPLATES[0];
  if (!fallback) {
    throw new Error('seedWeeklyChallenge: no templates configured');
  }
  if (Number.isNaN(t.getTime())) {
    return fallback;
  }
  // Rotation by ISO week-of-year approximation: ((days-since-epoch / 7) % length)
  const dayMs = 24 * 60 * 60 * 1000;
  const weekIndex = Math.floor(t.getTime() / dayMs / 7);
  const idx =
    ((weekIndex % WEEKLY_TEMPLATES.length) + WEEKLY_TEMPLATES.length) % WEEKLY_TEMPLATES.length;
  return WEEKLY_TEMPLATES[idx] ?? fallback;
}

export async function seedWeeklyChallenge(
  supabase: AdminSupabase,
  weekStart: string,
): Promise<ChallengeDTO> {
  const tpl = pickTemplate(weekStart);
  const insertResp = await supabase
    .from('studio_community_challenges')
    .insert({
      challenge_type: tpl.challenge_type,
      title: tpl.title,
      description: tpl.description,
      target_value: tpl.target_value,
      reward_xp: tpl.reward_xp,
      week_start: weekStart,
      is_active: true,
    })
    .select(
      'id, challenge_type, title, description, target_value, reward_xp, week_start, is_active, participants_count, completers_count, created_at',
    )
    .single();
  if (insertResp.error || !insertResp.data) {
    throw new Error(`seedWeeklyChallenge insert failed: ${insertResp.error?.message ?? 'no data'}`);
  }
  return rowToDto(insertResp.data as ChallengeRow);
}

export async function getLeaderboard(
  supabase: AdminSupabase,
  challengeId: string,
  limit = 10,
): Promise<ReadonlyArray<LeaderboardRowDTO>> {
  const { data, error } = await supabase
    .from('studio_challenge_participations')
    .select('id, user_id, project_id, completed_at')
    .eq('challenge_id', challengeId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`getLeaderboard failed: ${error.message}`);
  }
  const rows = (data ?? []) as ReadonlyArray<{
    id: string;
    user_id: string;
    project_id: string | null;
    completed_at: string | null;
  }>;
  return rows
    .filter((r): r is typeof r & { completed_at: string } => r.completed_at !== null)
    .map((r) => ({
      participationId: r.id,
      userId: r.user_id,
      projectId: r.project_id,
      completedAt: r.completed_at,
    }));
}

export type { ChallengeDTO, ChallengeType, LeaderboardRowDTO, ParticipationDTO };
export { pickTemplate, WEEKLY_TEMPLATES };
