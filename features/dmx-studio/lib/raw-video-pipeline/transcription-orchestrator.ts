// F14.F.6 Sprint 5 BIBLIA Tarea 5.2 — Transcription orchestrator.
// Reads audio_extract_storage_path → signed URL → Deepgram → persist transcription.

import { TRPCError } from '@trpc/server';
import { transcribeRawVideo as runTranscriptionStep } from './transcription-step';

export interface TranscriptionOrchestratorResult {
  transcript: string;
  durationSeconds: number;
  costUsd: number;
}

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 800;

export async function transcribeRawVideo(
  rawVideoId: string,
): Promise<TranscriptionOrchestratorResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await runTranscriptionStep(rawVideoId);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * attempt));
      }
    }
  }
  if (lastError instanceof TRPCError) throw lastError;
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `transcription failed after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  });
}
