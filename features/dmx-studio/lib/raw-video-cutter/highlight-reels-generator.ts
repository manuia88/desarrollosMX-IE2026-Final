// F14.F.6 Sprint 5 BIBLIA LATERAL 8 — Highlight reels generator.
// Videos > 5 min → Claude detecta 3 momentos más impactantes.

import { TRPCError } from '@trpc/server';
import { getDirectorClient } from '@/features/dmx-studio/lib/claude-director';
import { DIRECTOR_MODEL } from '@/features/dmx-studio/lib/claude-director/prompts';
import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface HighlightReelSpec {
  clipIndex: number;
  startMs: number;
  endMs: number;
  reason: string;
}

export interface GenerateHighlightReelsResult {
  reels: Array<{
    id: string;
    clipIndex: number;
    startMs: number;
    endMs: number;
    status: string;
  }>;
  costUsd: number;
}

const TARGET_REEL_COUNT = 3;
const REEL_MIN_MS = 15_000;
const REEL_MAX_MS = 30_000;

interface TranscriptionUtterance {
  start: number;
  end: number;
  transcript: string;
}

export async function generateHighlightReels(
  rawVideoId: string,
): Promise<GenerateHighlightReelsResult> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, transcription, duration_seconds, source_storage_path')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });
  if (!video.transcription) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'transcription required' });
  }

  const transcription = video.transcription as { utterances?: TranscriptionUtterance[] };
  const utterances = transcription.utterances ?? [];
  const durationMs = Math.round((video.duration_seconds ?? 0) * 1000);

  const { specs, costUsd } = await selectHighlightSpecs(utterances, durationMs);

  const records: GenerateHighlightReelsResult['reels'] = [];
  for (const spec of specs) {
    const { data: insertData, error: insertErr } = await supabase
      .from('studio_highlight_reels')
      .upsert(
        {
          source_raw_video_id: rawVideoId,
          user_id: video.user_id,
          clip_index: spec.clipIndex,
          start_ms: spec.startMs,
          end_ms: spec.endMs,
          reason: spec.reason,
          status: 'pending',
        },
        { onConflict: 'source_raw_video_id,clip_index' },
      )
      .select('id, clip_index, start_ms, end_ms, status')
      .single();
    if (insertErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertErr });
    records.push({
      id: insertData.id,
      clipIndex: insertData.clip_index,
      startMs: insertData.start_ms,
      endMs: insertData.end_ms,
      status: insertData.status,
    });
  }

  if (process.env.NODE_ENV === 'test' || process.env.RAW_VIDEO_FFMPEG_DRY_RUN === 'true') {
    return { reels: records, costUsd };
  }

  await renderHighlightReels(rawVideoId, video.user_id, video.source_storage_path, records);
  return { reels: records, costUsd };
}

async function selectHighlightSpecs(
  utterances: ReadonlyArray<TranscriptionUtterance>,
  durationMs: number,
): Promise<{ specs: HighlightReelSpec[]; costUsd: number }> {
  if (utterances.length === 0) return { specs: [], costUsd: 0 };

  if (process.env.RAW_VIDEO_DIRECTOR_DRY_RUN === 'true' || process.env.NODE_ENV === 'test') {
    return { specs: deterministicHeuristicSpecs(utterances, durationMs), costUsd: 0 };
  }

  try {
    const client = getDirectorClient();
    const transcriptDigest = utterances
      .slice(0, 100)
      .map((u, i) => `[${i}] (${u.start.toFixed(1)}s) ${u.transcript}`)
      .join('\n');

    const response = await client.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 800,
      system:
        'Eres editor de video inmobiliario LATAM. Selecciona los 3 momentos más impactantes ' +
        '(soundbites memorables, frases con gancho, datos sorprendentes). ' +
        'Cada highlight debe durar entre 15s y 30s. Devuelve SOLO JSON: ' +
        '{"highlights":[{"startSeconds":N,"endSeconds":N,"reason":"..."},...]}.',
      messages: [
        {
          role: 'user',
          content: `Transcripción:\n${transcriptDigest}`,
        },
      ],
    });

    const text = response.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { specs: deterministicHeuristicSpecs(utterances, durationMs), costUsd: 0 };
    }
    const parsed = JSON.parse(match[0]) as {
      highlights: Array<{ startSeconds: number; endSeconds: number; reason: string }>;
    };
    const specs: HighlightReelSpec[] = parsed.highlights
      .slice(0, TARGET_REEL_COUNT)
      .map((h, idx) => ({
        clipIndex: idx + 1,
        startMs: Math.round(h.startSeconds * 1000),
        endMs: Math.round(h.endSeconds * 1000),
        reason: h.reason.slice(0, 200),
      }))
      .filter((s) => {
        const dur = s.endMs - s.startMs;
        return dur >= REEL_MIN_MS && dur <= REEL_MAX_MS && s.endMs <= durationMs;
      });
    if (specs.length === 0) {
      return { specs: deterministicHeuristicSpecs(utterances, durationMs), costUsd: 0 };
    }
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const costUsd = (inputTokens * 0.003) / 1000 + (outputTokens * 0.015) / 1000;
    return { specs, costUsd };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'highlight-reels', op: 'select' },
    });
    return { specs: deterministicHeuristicSpecs(utterances, durationMs), costUsd: 0 };
  }
}

function deterministicHeuristicSpecs(
  utterances: ReadonlyArray<TranscriptionUtterance>,
  durationMs: number,
): HighlightReelSpec[] {
  if (utterances.length === 0) return [];
  const segments = [0.15, 0.5, 0.85].map((pct, idx) => {
    const targetMs = durationMs * pct;
    let nearest = utterances[0] as TranscriptionUtterance;
    for (const u of utterances) {
      if (Math.abs(u.start * 1000 - targetMs) < Math.abs(nearest.start * 1000 - targetMs)) {
        nearest = u;
      }
    }
    const startMs = Math.max(0, Math.round(nearest.start * 1000));
    const endMs = Math.min(durationMs, startMs + 20_000);
    return {
      clipIndex: idx + 1,
      startMs,
      endMs,
      reason: nearest.transcript.slice(0, 150),
    };
  });
  return segments.filter((s) => s.endMs - s.startMs >= REEL_MIN_MS);
}

async function renderHighlightReels(
  rawVideoId: string,
  userId: string,
  sourcePath: string,
  reels: ReadonlyArray<GenerateHighlightReelsResult['reels'][number]>,
): Promise<void> {
  const supabase = createAdminClient();
  for (const reel of reels) {
    let sandbox: Awaited<ReturnType<typeof createFFmpegSandbox>> | null = null;
    try {
      await supabase
        .from('studio_highlight_reels')
        .update({ status: 'generating' })
        .eq('id', reel.id);
      sandbox = await createFFmpegSandbox({ timeoutMs: 5 * 60 * 1000 });
      const startSec = (reel.startMs / 1000).toFixed(3);
      const durSec = ((reel.endMs - reel.startMs) / 1000).toFixed(3);
      const cmd = await sandbox.runCommand('ffmpeg', [
        '-ss',
        startSec,
        '-i',
        sourcePath,
        '-t',
        durSec,
        '-c:v',
        'libx264',
        '-c:a',
        'aac',
        `/tmp/${reel.id}.mp4`,
      ]);
      if (cmd.exitCode !== 0) throw new Error(`ffmpeg exit ${cmd.exitCode}`);
      const reelPath = `${userId}/${rawVideoId}/${reel.id}.mp4`;
      await supabase
        .from('studio_highlight_reels')
        .update({
          status: 'completed',
          reel_storage_path: reelPath,
          reel_duration_seconds: Number(durSec),
        })
        .eq('id', reel.id);
      await sandbox.stop();
    } catch (err) {
      sentry.captureException(err, {
        tags: { module: 'dmx-studio', component: 'highlight-reels', op: 'render' },
      });
      await supabase.from('studio_highlight_reels').update({ status: 'failed' }).eq('id', reel.id);
      if (sandbox) {
        try {
          await sandbox.stop();
        } catch (stopErr) {
          sentry.captureException(stopErr, {
            tags: { module: 'dmx-studio', component: 'highlight-reels', op: 'render-stop' },
          });
        }
      }
    }
  }
}
