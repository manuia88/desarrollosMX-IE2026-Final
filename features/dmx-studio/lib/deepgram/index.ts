// F14.F.6 Sprint 5 BIBLIA — Deepgram wrapper REAL (SDK v5).
// API: client.listen.v1.media.transcribeUrl + client.manage.v1.projects.list
// nova-3 model + es-419 ES-MX language + smart_format + utterances + punctuate.
// DEEPGRAM_API_KEY provisioned in Vercel + .env.local 2026-04-27.
// ADR-054 DMX Studio dentro DMX único entorno.

import { DeepgramClient } from '@deepgram/sdk';
import { TRPCError } from '@trpc/server';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface TranscribeAudioInput {
  audioUrl: string;
  languageCode?: string;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

export interface TranscriptionUtterance {
  start: number;
  end: number;
  transcript: string;
  confidence: number;
  words: TranscriptionWord[];
}

export interface TranscribeAudioResult {
  transcript: string;
  words: TranscriptionWord[];
  utterances: TranscriptionUtterance[];
  durationSeconds: number;
  costUsd: number;
}

export interface DeepgramSilence {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface TestConnectionResult {
  ok: boolean;
  accountActive: boolean;
  balanceRemaining?: number;
  reason?: string;
}

let cachedClient: DeepgramClient | null = null;

function getClient(): DeepgramClient {
  if (cachedClient !== null) return cachedClient;
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'DEEPGRAM_API_KEY no configurada en environment',
    });
  }
  const client = new DeepgramClient({ apiKey });
  cachedClient = client;
  return client;
}

export function _resetDeepgramCache(): void {
  cachedClient = null;
}

const COST_PER_MIN_USD = 0.0043;
const SILENCE_THRESHOLD_SECONDS = 2;

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
  const language = input.languageCode ?? 'es-419';
  try {
    const client = getClient();
    const responseRaw = await client.listen.v1.media.transcribeUrl({
      url: input.audioUrl,
      model: 'nova-3',
      language,
      smart_format: true,
      utterances: true,
      punctuate: true,
      filler_words: true,
    });

    const response = (responseRaw as { data?: unknown }).data ?? responseRaw;
    const result = response as {
      metadata?: { duration?: number };
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            words?: Array<{
              word: string;
              start: number;
              end: number;
              confidence: number;
              punctuated_word?: string;
            }>;
          }>;
        }>;
        utterances?: Array<{
          start: number;
          end: number;
          transcript: string;
          confidence: number;
          words?: Array<{
            word: string;
            start: number;
            end: number;
            confidence: number;
            punctuated_word?: string;
          }>;
        }>;
      };
    };

    const channel = result.results?.channels?.[0];
    const alt = channel?.alternatives?.[0];
    const utterancesRaw = result.results?.utterances ?? [];
    const utterances: TranscriptionUtterance[] = utterancesRaw.map((u) => ({
      start: u.start,
      end: u.end,
      transcript: u.transcript,
      confidence: u.confidence,
      words: (u.words ?? []).map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        ...(w.punctuated_word ? { punctuated_word: w.punctuated_word } : {}),
      })),
    }));

    const transcript = alt?.transcript ?? '';
    const rawWords = alt?.words ?? [];
    const words: TranscriptionWord[] = rawWords.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      ...(w.punctuated_word ? { punctuated_word: w.punctuated_word } : {}),
    }));

    const durationSeconds = result.metadata?.duration ?? 0;
    const costUsd = (durationSeconds / 60) * COST_PER_MIN_USD;

    return {
      transcript,
      words,
      utterances,
      durationSeconds,
      costUsd,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'deepgram', op: 'transcribe' },
      extra: { audioUrl: input.audioUrl, language },
    });
    if (err instanceof TRPCError) throw err;
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Deepgram transcribe failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

export function detectSilences(utterances: TranscriptionUtterance[]): DeepgramSilence[] {
  if (utterances.length < 2) return [];
  const silences: DeepgramSilence[] = [];
  for (let i = 1; i < utterances.length; i++) {
    const prev = utterances[i - 1];
    const curr = utterances[i];
    if (!prev || !curr) continue;
    const gapSeconds = curr.start - prev.end;
    if (gapSeconds >= SILENCE_THRESHOLD_SECONDS) {
      silences.push({
        startMs: Math.round(prev.end * 1000),
        endMs: Math.round(curr.start * 1000),
        durationMs: Math.round(gapSeconds * 1000),
      });
    }
  }
  return silences;
}

export async function testConnection(): Promise<TestConnectionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return { ok: false, accountActive: false, reason: 'DEEPGRAM_API_KEY missing' };
  }
  try {
    const client = getClient();
    const projectsResp = await client.manage.v1.projects.list();
    const list = ((projectsResp as { data?: { projects?: unknown[] } }).data?.projects ??
      (projectsResp as { projects?: unknown[] }).projects ??
      []) as unknown[];
    return {
      ok: true,
      accountActive: list.length > 0,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'deepgram', op: 'testConnection' },
    });
    return {
      ok: false,
      accountActive: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
