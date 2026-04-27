// F14.F.5 Sprint 4 — Calendario IA mensual generador (Tarea 4.1 BIBLIA).
// Llama Claude director con metricas asesor (leads + closed deals 30d).
// INSERT studio_content_calendar entries per dia. Persiste mood en
// studio_ai_coach_sessions + cost en studio_api_jobs (canon regla 15).
//
// Cost target: ~$0.30 per generacion mes completo (Sonnet 4.5 ~3000 input + 4000 output tokens).

import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { DIRECTOR_MODEL } from '@/features/dmx-studio/lib/claude-director/prompts';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';
import { detectMood, persistMoodSession } from './mood-detector';
import { getOptimalTiming, type SmartTimingPlatform } from './smart-timing';
import {
  type CalendarChannel,
  type CalendarContentType,
  type CalendarTopicKind,
  type GenerateMonthlyCalendarInput,
  GenerateMonthlyCalendarInputSchema,
  type GenerateMonthlyCalendarResult,
  type Mood,
} from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

const INPUT_COST_PER_MTOK = 3;
const OUTPUT_COST_PER_MTOK = 15;

interface DirectorClientLike {
  messages: {
    create: (args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
    }) => Promise<{
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

interface AsesorMetrics {
  readonly closedDeals7d: number;
  readonly closedDeals30d: number;
  readonly leads7d: number;
}

interface ClaudeCalendarEntry {
  dayOffset: number; // 0..30 (relative al primer dia del mes)
  channel: CalendarChannel;
  contentType: CalendarContentType;
  topicKind: CalendarTopicKind;
  topic: string;
  notes: string;
}

const CALENDAR_SYSTEM_PROMPT = `Eres un planificador de contenido inmobiliario LATAM experto es-MX. Genera un calendario de contenido para un mes completo (28-31 dias) para un asesor inmobiliario.

Output JSON estricto:
{
  "entries": [
    { "dayOffset": 0, "channel": "instagram", "contentType": "reel", "topicKind": "marca", "topic": "...", "notes": "..." }
  ]
}

Reglas:
- 12-18 entries totales (no todos los dias). Distribucion balanceada semana.
- channel: instagram | tiktok | facebook | wa_status | linkedin | email | blog
- contentType: video | reel | story | post | email_blast | blog_post
- topicKind canon (5 tints visuales): marca | propiedad | zona | remarketing | email
  - marca: posicionamiento personal asesor
  - propiedad: listing especifico (foto / tour / virtual staging)
  - zona: storytelling barrio (Polanco, Roma Norte, Condesa)
  - remarketing: re-engagement leads tibios
  - email: blast newsletter
- Mix sugerido: 50% propiedad, 20% zona, 15% marca, 10% remarketing, 5% email
- Adapta tono por mood (low=motivacional, neutral=consistente, high=energetico, celebratory=aspiracional).
- topic max 80 chars, notes max 200 chars.
- dayOffset 0 = primer dia del mes, max 30.
- Cero emoji en topic/notes (canon DMX).
- Responde EXCLUSIVAMENTE con el JSON.`;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_MTOK + outputTokens * OUTPUT_COST_PER_MTOK) / 1_000_000;
}

function stripCodeFences(raw: string): string {
  return raw.replace(/```json\s*|\s*```/g, '').trim();
}

function daysInMonth(monthDate: string): number {
  const [year, month] = monthDate.split('-').map(Number);
  if (!year || !month) return 30;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function offsetToDate(monthDate: string, offset: number): string {
  const [year, month] = monthDate.split('-').map(Number);
  if (!year || !month) return monthDate;
  const max = daysInMonth(monthDate);
  const day = Math.max(1, Math.min(max, offset + 1));
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function pickPlatform(channel: CalendarChannel): SmartTimingPlatform | null {
  if (channel === 'email' || channel === 'blog') return null;
  return channel as SmartTimingPlatform;
}

function dayOfWeekFor(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 1;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

async function fetchAsesorMetrics(supabase: AdminClient, userId: string): Promise<AsesorMetrics> {
  const now = new Date();
  const iso7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const iso30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [closed7, closed30, leads7] = await Promise.all([
    supabase
      .from('operaciones')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_id', userId)
      .gte('closed_at', iso7d),
    supabase
      .from('operaciones')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_id', userId)
      .gte('closed_at', iso30d),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_asesor_id', userId)
      .gte('created_at', iso7d),
  ]);

  return {
    closedDeals7d: closed7.count ?? 0,
    closedDeals30d: closed30.count ?? 0,
    leads7d: leads7.count ?? 0,
  };
}

async function persistApiJob(
  supabase: AdminClient,
  userId: string,
  costUsd: number,
  inputPayload: Json,
  outputPayload: Json,
  status: 'completed' | 'failed',
  errorMessage: string | null,
): Promise<void> {
  const startedAt = new Date(Date.now() - 1000).toISOString();
  const completedAt = new Date().toISOString();
  const { error } = await supabase.from('studio_api_jobs').insert({
    user_id: userId,
    job_type: 'claude_director',
    provider: 'anthropic',
    status,
    input_payload: inputPayload,
    output_payload: outputPayload,
    actual_cost_usd: costUsd,
    estimated_cost_usd: costUsd,
    started_at: startedAt,
    completed_at: completedAt,
    error_message: errorMessage,
  });
  if (error) {
    sentry.captureException(error, { tags: { feature: 'studio-calendar-api-job' } });
  }
}

export interface GenerateMonthlyCalendarOpts {
  readonly client?: AdminClient;
  readonly directorClient?: DirectorClientLike;
}

export async function generateMonthlyCalendar(
  input: GenerateMonthlyCalendarInput,
  opts?: GenerateMonthlyCalendarOpts,
): Promise<GenerateMonthlyCalendarResult> {
  const parsed = GenerateMonthlyCalendarInputSchema.parse(input);
  const supabase = opts?.client ?? createAdminClient();
  const llm = opts?.directorClient ?? (getDirectorClient() as unknown as DirectorClientLike);

  const metrics = await fetchAsesorMetrics(supabase, parsed.userId);
  const moodResult = detectMood(metrics);

  const userPrompt = `Genera calendario mensual para asesor inmobiliario MX.

Mes objetivo: ${parsed.monthDate}
Dias en el mes: ${daysInMonth(parsed.monthDate)}

Metricas asesor (ultimos periodos):
- closed_deals_7d: ${metrics.closedDeals7d}
- closed_deals_30d: ${metrics.closedDeals30d}
- leads_7d: ${metrics.leads7d}

Mood detectado: ${moodResult.mood}
Tono recomendado: ${moodResult.toneHint}

Genera 12-18 entries balanceadas (mix 50% propiedad / 20% zona / 15% marca / 10% remarketing / 5% email).`;

  let costUsd = 0;
  let entriesCreated = 0;
  let parsedEntries: ClaudeCalendarEntry[] = [];
  let claudeError: Error | null = null;

  try {
    const response = await llm.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 4000,
      system: CALENDAR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    costUsd = estimateCost(inputTokens, outputTokens);

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = stripCodeFences(textBlock?.text ?? '');
    const json = JSON.parse(text) as { entries?: ClaudeCalendarEntry[] };
    parsedEntries = (json.entries ?? []).filter(
      (e): e is ClaudeCalendarEntry =>
        typeof e.dayOffset === 'number' &&
        typeof e.channel === 'string' &&
        typeof e.contentType === 'string' &&
        typeof e.topicKind === 'string',
    );
  } catch (error) {
    claudeError = error instanceof Error ? error : new Error('claude calendar gen failed');
    sentry.captureException(claudeError, { tags: { feature: 'studio-calendar-generate' } });
  }

  if (claudeError || parsedEntries.length === 0) {
    await persistApiJob(
      supabase,
      parsed.userId,
      costUsd,
      { monthDate: parsed.monthDate, mood: moodResult.mood } as Json,
      {} as Json,
      'failed',
      claudeError?.message ?? 'no entries returned by claude',
    );
    if (claudeError) {
      throw claudeError;
    }
    // No entries pero no throw: persist mood + return empty.
    await persistMoodSession(
      {
        userId: parsed.userId,
        mood: moodResult.mood,
        sessionDate: offsetToDate(parsed.monthDate, 0),
      },
      { client: supabase },
    );
    return { entriesCreated: 0, costUsd, mood: moodResult.mood };
  }

  const insertRows = parsedEntries.map((entry) => {
    const scheduledFor = offsetToDate(parsed.monthDate, entry.dayOffset);
    const platform = pickPlatform(entry.channel);
    const dow = dayOfWeekFor(scheduledFor);
    const timing = platform ? getOptimalTiming(platform, dow) : null;
    const scheduledTime = timing ? `${String(timing.hour).padStart(2, '0')}:00:00` : null;
    return {
      user_id: parsed.userId,
      scheduled_for: scheduledFor,
      scheduled_time: scheduledTime,
      channel: entry.channel,
      content_type: entry.contentType,
      status: 'planned' as const,
      ai_generated: true,
      topic: entry.topic.slice(0, 200),
      notes: entry.notes.slice(0, 500),
      meta: {
        topic_kind: entry.topicKind,
        mood: moodResult.mood,
        tone_hint: moodResult.toneHint,
        smart_timing_reason: timing?.reason ?? null,
      } as Json,
    };
  });

  const { error: insertError, count } = await supabase
    .from('studio_content_calendar')
    .insert(insertRows, { count: 'exact' });

  if (insertError) {
    sentry.captureException(insertError, { tags: { feature: 'studio-calendar-insert' } });
    await persistApiJob(
      supabase,
      parsed.userId,
      costUsd,
      { monthDate: parsed.monthDate, mood: moodResult.mood } as Json,
      { entriesAttempted: insertRows.length } as Json,
      'failed',
      insertError.message,
    );
    throw new Error(`calendar insert failed: ${insertError.message}`);
  }

  entriesCreated = count ?? insertRows.length;

  await persistApiJob(
    supabase,
    parsed.userId,
    costUsd,
    { monthDate: parsed.monthDate, mood: moodResult.mood } as Json,
    { entriesCreated } as Json,
    'completed',
    null,
  );

  await persistMoodSession(
    {
      userId: parsed.userId,
      mood: moodResult.mood,
      sessionDate: offsetToDate(parsed.monthDate, 0),
    },
    { client: supabase },
  );

  return { entriesCreated, costUsd, mood: moodResult.mood };
}

export type { AsesorMetrics, Mood };
