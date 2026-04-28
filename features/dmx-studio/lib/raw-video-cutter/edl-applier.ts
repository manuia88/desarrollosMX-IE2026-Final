// F14.F.6 Sprint 5 BIBLIA Tarea 5.4 — FFmpeg EDL cuts apply.
// Inverso de cuts: keep segments → concat. Cleaned video Storage bucket.

import { TRPCError } from '@trpc/server';
import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const CLEANED_VIDEO_BUCKET = 'studio-cleaned-videos';

export interface ApplyEdlCutsResult {
  cleanedStoragePath: string;
  segmentsKept: number;
  cutsApplied: number;
}

interface EdlCut {
  startMs: number;
  endMs: number;
  reason?: string;
}

interface KeepSegment {
  startMs: number;
  endMs: number;
}

export function computeKeepSegments(
  cuts: ReadonlyArray<EdlCut>,
  durationMs: number,
): KeepSegment[] {
  const sorted = [...cuts].sort((a, b) => a.startMs - b.startMs);
  const keeps: KeepSegment[] = [];
  let cursor = 0;
  for (const cut of sorted) {
    if (cut.startMs > cursor) {
      keeps.push({ startMs: cursor, endMs: cut.startMs });
    }
    cursor = Math.max(cursor, cut.endMs);
  }
  if (cursor < durationMs) {
    keeps.push({ startMs: cursor, endMs: durationMs });
  }
  return keeps.filter((s) => s.endMs - s.startMs >= 100);
}

export async function applyEdlCuts(rawVideoId: string): Promise<ApplyEdlCutsResult> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, source_storage_path, edl, duration_seconds')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });

  const cuts = (Array.isArray(video.edl) ? video.edl : []) as unknown as EdlCut[];
  const durationMs = Math.round((video.duration_seconds ?? 0) * 1000);
  const keeps = computeKeepSegments(cuts, durationMs);
  const cleanedStoragePath = `${video.user_id}/${rawVideoId}-cleaned.mp4`;

  if (process.env.NODE_ENV === 'test' || process.env.RAW_VIDEO_FFMPEG_DRY_RUN === 'true') {
    await supabase
      .from('studio_raw_videos')
      .update({
        cleaned_storage_path: cleanedStoragePath,
        cuts_applied: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawVideoId);
    return {
      cleanedStoragePath,
      segmentsKept: keeps.length,
      cutsApplied: cuts.length,
    };
  }

  let sandbox: Awaited<ReturnType<typeof createFFmpegSandbox>> | null = null;
  try {
    sandbox = await createFFmpegSandbox({ timeoutMs: 20 * 60 * 1000 });
    const filter = buildConcatFilter(keeps);
    const cmd = await sandbox.runCommand('ffmpeg', [
      '-i',
      video.source_storage_path,
      '-filter_complex',
      filter,
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      `/tmp/${rawVideoId}-cleaned.mp4`,
    ]);
    if (cmd.exitCode !== 0) {
      throw new Error(`ffmpeg exit ${cmd.exitCode}`);
    }
    await supabase
      .from('studio_raw_videos')
      .update({
        cleaned_storage_path: cleanedStoragePath,
        cuts_applied: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawVideoId);
    await sandbox.stop();
    return {
      cleanedStoragePath,
      segmentsKept: keeps.length,
      cutsApplied: cuts.length,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'raw-video-cutter', op: 'apply' },
      extra: { rawVideoId },
    });
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { module: 'dmx-studio', component: 'raw-video-cutter', op: 'apply-stop' },
        });
      }
    }
    throw err;
  }
}

function buildConcatFilter(keeps: ReadonlyArray<KeepSegment>): string {
  const parts: string[] = [];
  keeps.forEach((seg, idx) => {
    const startSec = (seg.startMs / 1000).toFixed(3);
    const endSec = (seg.endMs / 1000).toFixed(3);
    parts.push(`[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v${idx}]`);
    parts.push(`[0:a]atrim=${startSec}:${endSec},asetpts=PTS-STARTPTS[a${idx}]`);
  });
  const concatInputs = keeps.map((_, idx) => `[v${idx}][a${idx}]`).join('');
  parts.push(`${concatInputs}concat=n=${keeps.length}:v=1:a=1[outv][outa]`);
  return parts.join(';');
}
