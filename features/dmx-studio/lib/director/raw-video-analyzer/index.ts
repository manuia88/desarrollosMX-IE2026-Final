// F14.F.6 Sprint 5 BIBLIA Tarea 5.3 — Raw video analyzer (director Claude).
// Filler + bad take + auto-chapters + EDL generation. Heuristic ES-MX + Claude judgment.

import { TRPCError } from '@trpc/server';
import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { DIRECTOR_MODEL } from '@/features/dmx-studio/lib/claude-director/prompts';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import {
  type Chapter,
  generateChaptersFromUtterances,
  shouldGenerateChapters,
} from './auto-chapters';
import { type DetectorWord, detectBadTakes } from './bad-take-detector';
import {
  computeFillerStats,
  isFiller,
  normalizeWord,
  SILENCE_THRESHOLD_MS,
} from './filler-patterns';

export type EdlReason = 'filler' | 'silence' | 'bad_take' | 'repetition';

export interface EdlCut {
  startMs: number;
  endMs: number;
  reason: EdlReason;
  preview?: string;
}

export interface RawVideoAnalysisResult {
  edl: EdlCut[];
  chapters: Chapter[];
  fillerStats: {
    totalCount: number;
    topFillers: Array<{ word: string; count: number }>;
  };
  badTakesCount: number;
  costUsd: number;
}

const PADDING_MS = 100;

interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

interface TranscriptionUtterance {
  start: number;
  end: number;
  transcript: string;
  confidence?: number;
}

export async function analyzeRawVideo(rawVideoId: string): Promise<RawVideoAnalysisResult> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('studio_raw_videos')
    .select('id, transcription, duration_seconds')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });
  if (!video.transcription) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'transcription required' });
  }

  const transcription = video.transcription as {
    words?: TranscriptionWord[];
    utterances?: TranscriptionUtterance[];
    transcript?: string;
  };
  const words = transcription.words ?? [];
  const utterances = transcription.utterances ?? [];

  const fillerCuts = buildFillerCuts(words);
  const silenceCuts = buildSilenceCuts(utterances);

  const detectorWords: DetectorWord[] = words.map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }));
  const badTakes = detectBadTakes(detectorWords);
  const badTakeCuts: EdlCut[] = badTakes.map((bt) => ({
    startMs: bt.startMs,
    endMs: bt.endMs,
    reason: bt.reason === 'false_start' ? 'bad_take' : 'repetition',
    preview: bt.preview,
  }));

  const edl = mergeAndSortCuts([...fillerCuts, ...silenceCuts, ...badTakeCuts]);
  const fillerStats = computeFillerStats(words);

  let chapters: Chapter[] = [];
  let costUsd = 0;
  const durationMs = Math.round((video.duration_seconds ?? 0) * 1000);
  if (shouldGenerateChapters(durationMs)) {
    try {
      const result = await generateChaptersWithClaude(utterances, durationMs);
      chapters = result.chapters;
      costUsd = result.costUsd;
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'raw-video-analyzer', op: 'chapters' },
      });
      chapters = generateChaptersFromUtterances(utterances, durationMs);
    }
  }

  await supabase
    .from('studio_raw_videos')
    .update({
      edl: edl as unknown as never,
      chapters: chapters as unknown as never,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rawVideoId);

  return {
    edl,
    chapters,
    fillerStats,
    badTakesCount: badTakeCuts.length,
    costUsd,
  };
}

function buildFillerCuts(words: ReadonlyArray<TranscriptionWord>): EdlCut[] {
  const cuts: EdlCut[] = [];
  for (const w of words) {
    if (isFiller(w.word)) {
      cuts.push({
        startMs: Math.max(0, Math.round(w.start * 1000) - PADDING_MS),
        endMs: Math.round(w.end * 1000) + PADDING_MS,
        reason: 'filler',
        preview: normalizeWord(w.word),
      });
    }
  }
  return cuts;
}

function buildSilenceCuts(utterances: ReadonlyArray<TranscriptionUtterance>): EdlCut[] {
  if (utterances.length < 2) return [];
  const cuts: EdlCut[] = [];
  for (let i = 1; i < utterances.length; i++) {
    const prev = utterances[i - 1];
    const curr = utterances[i];
    if (!prev || !curr) continue;
    const gapMs = Math.round((curr.start - prev.end) * 1000);
    if (gapMs >= SILENCE_THRESHOLD_MS) {
      cuts.push({
        startMs: Math.round(prev.end * 1000),
        endMs: Math.round(curr.start * 1000),
        reason: 'silence',
      });
    }
  }
  return cuts;
}

function mergeAndSortCuts(cuts: EdlCut[]): EdlCut[] {
  if (cuts.length === 0) return cuts;
  const sorted = [...cuts].sort((a, b) => a.startMs - b.startMs);
  const merged: EdlCut[] = [sorted[0] as EdlCut];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1] as EdlCut;
    const curr = sorted[i] as EdlCut;
    if (curr.startMs <= prev.endMs) {
      prev.endMs = Math.max(prev.endMs, curr.endMs);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

interface ChaptersClaudeResult {
  chapters: Chapter[];
  costUsd: number;
}

async function generateChaptersWithClaude(
  utterances: ReadonlyArray<TranscriptionUtterance>,
  durationMs: number,
): Promise<ChaptersClaudeResult> {
  if (utterances.length === 0) {
    return { chapters: generateChaptersFromUtterances(utterances, durationMs), costUsd: 0 };
  }

  if (process.env.RAW_VIDEO_DIRECTOR_DRY_RUN === 'true' || process.env.NODE_ENV === 'test') {
    return {
      chapters: generateChaptersFromUtterances(utterances, durationMs),
      costUsd: 0,
    };
  }

  const client = getDirectorClient();
  const transcriptDigest = utterances
    .slice(0, 80)
    .map((u, i) => `[${i}] (${u.start.toFixed(1)}s) ${u.transcript}`)
    .join('\n');

  const response = await client.messages.create({
    model: DIRECTOR_MODEL,
    max_tokens: 1500,
    system:
      'Eres un editor de video inmobiliario LATAM. Divide la transcripción en 3-7 capítulos. ' +
      'Devuelve SOLO JSON: {"chapters":[{"title":"...","startSeconds":N},...]}. ' +
      'Títulos descriptivos y cortos (max 60 chars). Ordenados por startSeconds.',
    messages: [
      {
        role: 'user',
        content: `Transcripción (utterances numeradas):\n${transcriptDigest}\n\nDuración total: ${(durationMs / 1000).toFixed(0)}s.`,
      },
    ],
  });

  const text = response.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim();

  let parsed: { chapters: Array<{ title: string; startSeconds: number }> };
  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text) as typeof parsed;
  } catch {
    return {
      chapters: generateChaptersFromUtterances(utterances, durationMs),
      costUsd: 0,
    };
  }

  const chapters: Chapter[] = parsed.chapters
    .map((c, idx, arr) => {
      const startMs = Math.round(c.startSeconds * 1000);
      const next = arr[idx + 1];
      const endMs = next ? Math.round(next.startSeconds * 1000) : durationMs;
      return { title: c.title.slice(0, 80), startMs, endMs };
    })
    .filter((c) => c.endMs > c.startMs);

  const costUsd = estimateClaudeCost(response.usage);
  return { chapters, costUsd };
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

function estimateClaudeCost(usage: AnthropicUsage | undefined): number {
  if (!usage) return 0;
  const input = ((usage.input_tokens ?? 0) * 0.003) / 1000;
  const output = ((usage.output_tokens ?? 0) * 0.015) / 1000;
  return input + output;
}
