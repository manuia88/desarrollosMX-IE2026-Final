// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Audio extract via Vercel Sandbox FFmpeg.
// FFmpeg cmd: ffmpeg -i video.mp4 -vn -acodec libmp3lame -ab 192k audio.mp3.

import { TRPCError } from '@trpc/server';
import { createFFmpegSandbox } from '@/features/dmx-studio/lib/sandbox';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const RAW_AUDIO_BUCKET = 'studio-raw-audio';

export interface ExtractAudioResult {
  audioStoragePath: string;
}

export async function extractAudioFromVideo(rawVideoId: string): Promise<ExtractAudioResult> {
  const supabase = createAdminClient();
  const { data: video, error: vErr } = await supabase
    .from('studio_raw_videos')
    .select('id, source_storage_path, user_id')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (vErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: vErr });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });

  const audioStoragePath = `${video.user_id}/${rawVideoId}.mp3`;

  if (process.env.NODE_ENV === 'test' || process.env.RAW_VIDEO_FFMPEG_DRY_RUN === 'true') {
    const { error: uErr } = await supabase
      .from('studio_raw_videos')
      .update({
        audio_extract_storage_path: audioStoragePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawVideoId);
    if (uErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: uErr });
    return { audioStoragePath };
  }

  let sandbox: Awaited<ReturnType<typeof createFFmpegSandbox>> | null = null;
  try {
    sandbox = await createFFmpegSandbox({ timeoutMs: 10 * 60 * 1000 });
    const cmd = await sandbox.runCommand('ffmpeg', [
      '-i',
      video.source_storage_path,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-ab',
      '192k',
      `/tmp/${rawVideoId}.mp3`,
    ]);
    if (cmd.exitCode !== 0) {
      throw new Error(`ffmpeg exit ${cmd.exitCode}`);
    }
    const { error: uErr } = await supabase
      .from('studio_raw_videos')
      .update({
        audio_extract_storage_path: audioStoragePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawVideoId);
    if (uErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: uErr });
    await sandbox.stop();
    return { audioStoragePath };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'raw-video-uploader', op: 'audio-extract' },
      extra: { rawVideoId },
    });
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { module: 'dmx-studio', component: 'raw-video-uploader', op: 'audio-stop' },
        });
      }
    }
    throw err;
  }
}
