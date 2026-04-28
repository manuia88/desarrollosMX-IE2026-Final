// F14.F.6 Sprint 5 BIBLIA LATERAL 6 — Speech analytics calculator.
// WPM + filler ratio + clarity score + sentiment.

import { TRPCError } from '@trpc/server';
import { computeFillerStats } from '@/features/dmx-studio/lib/director/raw-video-analyzer/filler-patterns';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface CalculateAnalyticsInput {
  rawVideoId: string;
  userId: string;
}

export interface CalculateAnalyticsResult {
  wpm: number;
  fillerCount: number;
  fillerRatioPct: number;
  badTakesCount: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  clarityScore: number;
  topFillers: Array<{ word: string; count: number }>;
}

interface TranscriptionShape {
  words?: Array<{ word: string; start: number; end: number }>;
  utterances?: Array<{ start: number; end: number; transcript: string; confidence?: number }>;
}

interface EdlCutShape {
  reason?: string;
}

export async function calculateAnalytics(
  input: CalculateAnalyticsInput,
): Promise<CalculateAnalyticsResult> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, transcription, duration_seconds, edl')
    .eq('id', input.rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });
  if (video.user_id !== input.userId) throw new TRPCError({ code: 'FORBIDDEN' });
  if (!video.transcription) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'transcription required' });
  }

  const transcription = video.transcription as TranscriptionShape;
  const words = transcription.words ?? [];
  const utterances = transcription.utterances ?? [];
  const edl = (Array.isArray(video.edl) ? video.edl : []) as EdlCutShape[];
  const durationSeconds = Number(video.duration_seconds ?? 0);
  const durationMinutes = durationSeconds > 0 ? durationSeconds / 60 : 1;

  const wpm = Math.round((words.length / durationMinutes) * 100) / 100;
  const fillerStats = computeFillerStats(words);
  const fillerCount = fillerStats.totalCount;
  const fillerRatioPct =
    words.length === 0 ? 0 : Math.round((fillerCount / words.length) * 10000) / 100;
  const badTakesCount = edl.filter(
    (c) => c.reason === 'bad_take' || c.reason === 'repetition',
  ).length;
  const sentiment = detectSentiment(utterances);
  const clarityScore = computeClarityScore(wpm, fillerRatioPct, utterances);

  await supabase.from('studio_speech_analytics').upsert(
    {
      raw_video_id: input.rawVideoId,
      user_id: input.userId,
      words_per_minute: wpm,
      filler_count: fillerCount,
      filler_ratio_pct: fillerRatioPct,
      bad_takes_count: badTakesCount,
      sentiment,
      clarity_score: clarityScore,
      top_fillers: fillerStats.topFillers,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: 'raw_video_id' },
  );

  return {
    wpm,
    fillerCount,
    fillerRatioPct,
    badTakesCount,
    sentiment,
    clarityScore,
    topFillers: fillerStats.topFillers,
  };
}

function detectSentiment(
  utterances: ReadonlyArray<{ confidence?: number; transcript: string }>,
): 'positive' | 'neutral' | 'negative' | 'mixed' {
  if (utterances.length === 0) return 'neutral';
  const positiveSignals = ['excelente', 'increíble', 'gran', 'mejor', 'maravilloso', 'perfecto'];
  const negativeSignals = ['mal', 'pésimo', 'horrible', 'no me gusta', 'difícil'];
  let pos = 0;
  let neg = 0;
  for (const u of utterances) {
    const lower = u.transcript.toLowerCase();
    for (const p of positiveSignals) if (lower.includes(p)) pos++;
    for (const n of negativeSignals) if (lower.includes(n)) neg++;
  }
  if (pos > 0 && neg > 0) return 'mixed';
  if (pos > 0) return 'positive';
  if (neg > 0) return 'negative';
  return 'neutral';
}

function computeClarityScore(
  wpm: number,
  fillerRatioPct: number,
  utterances: ReadonlyArray<{ confidence?: number }>,
): number {
  const wpmScore = wpm >= 130 && wpm <= 180 ? 40 : Math.max(0, 40 - Math.abs(wpm - 155) * 0.5);
  const fillerScore = Math.max(0, 30 - fillerRatioPct * 5);
  const confidences = utterances.map((u) => u.confidence ?? 0.95);
  const avgConfidence =
    confidences.length === 0 ? 0.95 : confidences.reduce((s, c) => s + c, 0) / confidences.length;
  const confScore = avgConfidence * 30;
  return Math.max(0, Math.min(100, Math.round(wpmScore + fillerScore + confScore)));
}
