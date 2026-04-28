// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Raw video uploader (server-only).
// Browser-safe constants en ./constants. Audio extractor depende de @vercel/sandbox.

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { extractAudioFromVideo } from './audio-extractor';
import { RAW_VIDEO_MAX_BYTES, type RawVideoMimeType } from './constants';

export type { RawVideoMimeType } from './constants';
export {
  RAW_AUDIO_BUCKET,
  RAW_VIDEO_BUCKET,
  RAW_VIDEO_MAX_BYTES,
  RAW_VIDEO_MIME_TYPES,
} from './constants';

export interface RegisterRawVideoInput {
  userId: string;
  sourceStoragePath: string;
  fileSizeBytes: number;
  mimeType: RawVideoMimeType;
  projectId?: string;
  durationSeconds?: number;
}

export interface RegisterRawVideoResult {
  rawVideoId: string;
  storagePath: string;
}

export async function registerRawVideo(
  input: RegisterRawVideoInput,
): Promise<RegisterRawVideoResult> {
  if (input.fileSizeBytes > RAW_VIDEO_MAX_BYTES) {
    throw new TRPCError({
      code: 'PAYLOAD_TOO_LARGE',
      message: `file_size_bytes=${input.fileSizeBytes} exceeds max ${RAW_VIDEO_MAX_BYTES}`,
    });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_raw_videos')
    .insert({
      user_id: input.userId,
      source_storage_path: input.sourceStoragePath,
      file_size_bytes: input.fileSizeBytes,
      mime_type: input.mimeType,
      project_id: input.projectId ?? null,
      duration_seconds: input.durationSeconds ?? null,
      transcription_status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  return { rawVideoId: data.id, storagePath: input.sourceStoragePath };
}

export async function triggerAudioExtract(
  rawVideoId: string,
): Promise<{ audioStoragePath: string }> {
  return await extractAudioFromVideo(rawVideoId);
}
