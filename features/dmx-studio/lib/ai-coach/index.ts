// F14.F.5 Sprint 4 UPGRADE 8 LATERAL — DMX Studio AI coach diario.
// Owned por sub-agent 5. getDailyCoachSession + generateCoachSession (Claude wrapper)
// + recordResponse + dismissSession. Mock-friendly: opts.client / opts.now inyectables.
//
// STUB ADR-018 — Full chat (multiple back-and-forth turns) defer H2:
// L-NEW-AI-COACH-FULL-CHAT-EXTEND. H1 sólo 1 mensaje display + acknowledge buttons.

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database } from '@/shared/types/database';
import type { CoachSessionDTO, Mood, UserMetricsContext } from './types';

export type AdminSupabase = SupabaseClient<Database>;

const COACH_MODEL = 'claude-sonnet-4-5-20250929';
const COACH_SYSTEM_PROMPT_ES_MX = `Eres el coach diario de un asesor inmobiliario LATAM que usa DMX Studio para producir videos cortos. Devuelves UN mensaje breve (≤ 240 chars), tono cálido cercano y profesional, en español neutro, sin emojis. Sugiere UNA acción concreta accionable hoy basada en el mood detectado y métricas. Devuelve SOLO el texto del mensaje, sin JSON ni etiquetas.`;

let cachedClient: Anthropic | null = null;

function getCoachClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('ai-coach: ANTHROPIC_API_KEY missing');
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

interface CoachSessionRow {
  id: string;
  user_id: string;
  session_date: string;
  mood_detected: string;
  suggested_action: string;
  user_response: string | null;
  completed: boolean;
  dismissed: boolean;
  created_at: string;
}

function rowToDto(row: CoachSessionRow): CoachSessionDTO {
  return {
    id: row.id,
    userId: row.user_id,
    sessionDate: row.session_date,
    moodDetected: row.mood_detected as Mood,
    suggestedAction: row.suggested_action,
    userResponse: row.user_response,
    completed: row.completed,
    dismissed: row.dismissed,
    createdAt: row.created_at,
  };
}

function todayDateUtc(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface GenerateCoachSessionOpts {
  readonly client?: Anthropic;
  readonly now?: Date;
}

function buildUserPrompt(mood: Mood, metrics: UserMetricsContext | null): string {
  const lines = [`Mood detectado: ${mood}.`];
  if (metrics) {
    lines.push(`Racha actual: ${metrics.streakCurrentDays} días.`);
    lines.push(`Videos generados este mes: ${metrics.videosThisMonth}.`);
    lines.push(`Videos restantes en plan: ${metrics.videosRemaining}.`);
  }
  lines.push(
    'Devuelve UN mensaje motivacional accionable (≤ 240 chars) con UNA acción concreta para hoy.',
  );
  return lines.join('\n');
}

async function callClaudeCoach(
  mood: Mood,
  metrics: UserMetricsContext | null,
  opts: GenerateCoachSessionOpts,
): Promise<string> {
  const client = opts.client ?? getCoachClient();
  const userPrompt = buildUserPrompt(mood, metrics);
  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 220,
      system: COACH_SYSTEM_PROMPT_ES_MX,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!block) {
      throw new Error('ai-coach: claude returned no text block');
    }
    const text = block.text.trim();
    if (text.length === 0) {
      throw new Error('ai-coach: claude returned empty text');
    }
    return text.slice(0, 480);
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'studio-ai-coach', op: 'callClaudeCoach', model: COACH_MODEL },
      extra: { mood },
    });
    throw err;
  }
}

export async function generateCoachSession(
  supabase: AdminSupabase,
  userId: string,
  mood: Mood,
  metrics: UserMetricsContext | null = null,
  opts: GenerateCoachSessionOpts = {},
): Promise<CoachSessionDTO> {
  const now = opts.now ?? new Date();
  const sessionDate = todayDateUtc(now);
  const startedAt = now.toISOString();

  const { data: jobRow, error: jobErr } = await supabase
    .from('studio_api_jobs')
    .insert({
      user_id: userId,
      provider: 'anthropic',
      job_type: 'ai_coach_session',
      status: 'started',
      input_payload: { mood, metrics: metrics ?? null } as never,
      estimated_cost_usd: 0.05,
      started_at: startedAt,
    } as never)
    .select('id')
    .single();
  if (jobErr || !jobRow) {
    throw new Error(`generateCoachSession job insert failed: ${jobErr?.message ?? 'no data'}`);
  }
  const jobId = jobRow.id;

  let suggestedAction: string;
  try {
    suggestedAction = await callClaudeCoach(mood, metrics, opts);
  } catch (err) {
    await supabase
      .from('studio_api_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : 'unknown',
      } as never)
      .eq('id', jobId);
    throw err;
  }

  await supabase
    .from('studio_api_jobs')
    .update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      output_payload: { suggested_action: suggestedAction } as never,
      actual_cost_usd: 0.05,
    } as never)
    .eq('id', jobId);

  const insertResp = await supabase
    .from('studio_ai_coach_sessions')
    .insert({
      user_id: userId,
      session_date: sessionDate,
      mood_detected: mood,
      suggested_action: suggestedAction,
      completed: false,
      dismissed: false,
    })
    .select(
      'id, user_id, session_date, mood_detected, suggested_action, user_response, completed, dismissed, created_at',
    )
    .single();
  if (insertResp.error || !insertResp.data) {
    throw new Error(
      `generateCoachSession session insert failed: ${insertResp.error?.message ?? 'no data'}`,
    );
  }
  return rowToDto(insertResp.data as CoachSessionRow);
}

export interface GetDailyCoachSessionOpts extends GenerateCoachSessionOpts {
  readonly defaultMood?: Mood;
  readonly metrics?: UserMetricsContext | null;
}

export async function getDailyCoachSession(
  supabase: AdminSupabase,
  userId: string,
  opts: GetDailyCoachSessionOpts = {},
): Promise<CoachSessionDTO> {
  const now = opts.now ?? new Date();
  const sessionDate = todayDateUtc(now);

  const existingResp = await supabase
    .from('studio_ai_coach_sessions')
    .select(
      'id, user_id, session_date, mood_detected, suggested_action, user_response, completed, dismissed, created_at',
    )
    .eq('user_id', userId)
    .eq('session_date', sessionDate)
    .maybeSingle();
  if (existingResp.error) {
    throw new Error(`getDailyCoachSession select failed: ${existingResp.error.message}`);
  }
  if (existingResp.data) {
    return rowToDto(existingResp.data as CoachSessionRow);
  }

  const mood: Mood = opts.defaultMood ?? 'neutral';
  return generateCoachSession(supabase, userId, mood, opts.metrics ?? null, opts);
}

export async function recordResponse(
  supabase: AdminSupabase,
  sessionId: string,
  userResponse: string,
  completed: boolean,
): Promise<CoachSessionDTO> {
  const updateResp = await supabase
    .from('studio_ai_coach_sessions')
    .update({ user_response: userResponse, completed })
    .eq('id', sessionId)
    .select(
      'id, user_id, session_date, mood_detected, suggested_action, user_response, completed, dismissed, created_at',
    )
    .single();
  if (updateResp.error || !updateResp.data) {
    throw new Error(`recordResponse update failed: ${updateResp.error?.message ?? 'no data'}`);
  }
  return rowToDto(updateResp.data as CoachSessionRow);
}

export async function dismissSession(
  supabase: AdminSupabase,
  sessionId: string,
): Promise<CoachSessionDTO> {
  const updateResp = await supabase
    .from('studio_ai_coach_sessions')
    .update({ dismissed: true })
    .eq('id', sessionId)
    .select(
      'id, user_id, session_date, mood_detected, suggested_action, user_response, completed, dismissed, created_at',
    )
    .single();
  if (updateResp.error || !updateResp.data) {
    throw new Error(`dismissSession update failed: ${updateResp.error?.message ?? 'no data'}`);
  }
  return rowToDto(updateResp.data as CoachSessionRow);
}

export type { CoachSessionDTO, Mood, UserMetricsContext };
export { COACH_MODEL, COACH_SYSTEM_PROMPT_ES_MX, todayDateUtc };
