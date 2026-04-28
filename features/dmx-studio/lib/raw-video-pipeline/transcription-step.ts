// F14.F.6 Sprint 5 BIBLIA Tarea 5.2 — Transcription step. Calls Deepgram + persists.

import { TRPCError } from '@trpc/server';
import { transcribeAudio } from '@/features/dmx-studio/lib/deepgram';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface TranscriptionStepResult {
  transcript: string;
  durationSeconds: number;
  costUsd: number;
}

const SIGNED_URL_TTL_SECONDS = 3600;

export async function transcribeRawVideo(rawVideoId: string): Promise<TranscriptionStepResult> {
  const supabase = createAdminClient();
  const { data: video, error: vErr } = await supabase
    .from('studio_raw_videos')
    .select('id, audio_extract_storage_path, user_id')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (vErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: vErr });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });
  if (!video.audio_extract_storage_path) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'audio_extract_storage_path missing',
    });
  }

  await supabase
    .from('studio_raw_videos')
    .update({ transcription_status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', rawVideoId);

  let signedUrl = video.audio_extract_storage_path;
  if (!signedUrl.startsWith('http')) {
    const { data: signed, error: sErr } = await supabase.storage
      .from('studio-raw-audio')
      .createSignedUrl(video.audio_extract_storage_path, SIGNED_URL_TTL_SECONDS);
    if (sErr || !signed?.signedUrl) {
      await supabase
        .from('studio_raw_videos')
        .update({ transcription_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', rawVideoId);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `signed URL failed: ${sErr?.message ?? 'unknown'}`,
      });
    }
    signedUrl = signed.signedUrl;
  }

  try {
    const result = await transcribeAudio({ audioUrl: signedUrl, languageCode: 'es-419' });
    await supabase
      .from('studio_raw_videos')
      .update({
        transcription: {
          transcript: result.transcript,
          words: result.words,
          utterances: result.utterances,
        } as unknown as never,
        transcription_status: 'completed',
        duration_seconds: result.durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rawVideoId);

    await supabase.from('studio_api_jobs').insert({
      user_id: video.user_id,
      job_type: 'deepgram_transcribe',
      provider: 'deepgram',
      status: 'completed',
      actual_cost_usd: result.costUsd,
      input_payload: { raw_video_id: rawVideoId },
      output_payload: {
        transcript_length: result.transcript.length,
        duration_seconds: result.durationSeconds,
      },
      meta: { sprint: 'F14.F.6' },
    });

    return {
      transcript: result.transcript,
      durationSeconds: result.durationSeconds,
      costUsd: result.costUsd,
    };
  } catch (err) {
    await supabase
      .from('studio_raw_videos')
      .update({ transcription_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', rawVideoId);
    throw err;
  }
}
