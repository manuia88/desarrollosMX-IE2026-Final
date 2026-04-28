// F14.F.6 Sprint 5 BIBLIA Tarea 5.5 — FFmpeg subtitles overlay applier.

import { TRPCError } from '@trpc/server';
import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { generateSrt } from './srt-generator';
import { buildAssForceStyle, getStyle, type SubtitleStyleKey } from './styles-canon';

export const SUBTITLED_BUCKET = 'studio-subtitled-videos';

export interface ApplySubtitlesInput {
  rawVideoId: string;
  styleKey: SubtitleStyleKey;
}

export interface ApplySubtitlesResult {
  outputStoragePath: string;
  styleKey: SubtitleStyleKey;
}

export async function applySubtitlesToVideo(
  input: ApplySubtitlesInput,
): Promise<ApplySubtitlesResult> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, source_storage_path, cleaned_storage_path, transcription')
    .eq('id', input.rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });
  if (!video.transcription) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'transcription required' });
  }

  const sourceVideoPath = video.cleaned_storage_path ?? video.source_storage_path;
  const outputStoragePath = `${video.user_id}/${input.rawVideoId}-${input.styleKey}.mp4`;
  const style = getStyle(input.styleKey);
  const _forceStyle = buildAssForceStyle(style);

  if (process.env.NODE_ENV === 'test' || process.env.RAW_VIDEO_FFMPEG_DRY_RUN === 'true') {
    return { outputStoragePath, styleKey: input.styleKey };
  }

  let sandbox: Awaited<ReturnType<typeof createFFmpegSandbox>> | null = null;
  try {
    const srtContent = generateSrt(video.transcription);
    sandbox = await createFFmpegSandbox({ timeoutMs: 15 * 60 * 1000 });
    const srtPath = `/tmp/${input.rawVideoId}.srt`;
    await sandbox.runCommand('sh', [
      '-c',
      `printf %s '${srtContent.replace(/'/g, "'\\''")}' > ${srtPath}`,
    ]);
    const cmd = await sandbox.runCommand('ffmpeg', [
      '-i',
      sourceVideoPath,
      '-vf',
      `subtitles=${srtPath}:force_style='${_forceStyle}'`,
      '-c:a',
      'copy',
      `/tmp/${input.rawVideoId}-${input.styleKey}.mp4`,
    ]);
    if (cmd.exitCode !== 0) throw new Error(`ffmpeg exit ${cmd.exitCode}`);
    await sandbox.stop();
    return { outputStoragePath, styleKey: input.styleKey };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'subtitles', op: 'apply' },
    });
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { module: 'dmx-studio', component: 'subtitles', op: 'apply-stop' },
        });
      }
    }
    throw err;
  }
}
