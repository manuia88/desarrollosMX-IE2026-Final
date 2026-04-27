// FASE 14.F.0 (Sprint 5 H2 BIBLIA v4) — DMX Studio dentro DMX único entorno (ADR-054).
// STUB ADR-018 — activar Sprint 5 cuando DEEPGRAM_API_KEY provisionado + plan enterprise validado.
// 4 señales:
// 1) este comentario top
// 2) UI badge [próximamente · Sprint 5] cuando feature toggle off (DEEPGRAM_TRANSCRIPTION_ENABLED)
// 3) docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx Sprint 5 spec transcripción video crudo
// 4) TRPCError NOT_IMPLEMENTED en cada función principal (no throw genérico)

import { TRPCError } from '@trpc/server';

export const STUB_MESSAGE =
  'Deepgram transcription shipping en Sprint 5 H2 (BIBLIA v4 spec video raw → texto).';

export interface TranscribeAudioInput {
  audioUrl: string;
  languageCode?: string;
}

// TODO Sprint 5 (BIBLIA v4 §5 Transcripción video crudo):
// - Provisionar DEEPGRAM_API_KEY en Vercel env (verify-before-spend pricing dashboard)
// - Validar uso enterprise plan: $0.0043/min nova-2-general (verificar con dashboard real)
// - SDK: @deepgram/sdk (NO instalar hasta sprint activate)
// - Model canon: nova-2-general (multilingual, detect lang auto si languageCode omit)
// - Integration: const dg = createClient(process.env.DEEPGRAM_API_KEY)
//                dg.listen.prerecorded.transcribeUrl({ url: audioUrl }, { model: 'nova-2-general', language })
// - Output: { transcript, words[], paragraphs[], utterances[] } → persistir studio_transcripts
// - Wrap calls en sentry.captureException con tags { feature: 'dmx-studio.deepgram' }

export async function transcribeAudio(_input: TranscribeAudioInput): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function testConnection(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: 'STUB H2 Sprint 5 Deepgram transcription' };
}
