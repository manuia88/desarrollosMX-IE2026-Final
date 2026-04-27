// FASE 14.F.0 (Sprint 7 H2 BIBLIA v4) — DMX Studio dentro DMX único entorno (ADR-054).
// STUB ADR-018 — activar Sprint 7 cuando HEYGEN_API_KEY provisionado + avatar canon DMX seleccionado.
// 4 señales:
// 1) este comentario top
// 2) UI badge [próximamente · Sprint 7] cuando feature toggle off (HEYGEN_AVATAR_ENABLED)
// 3) docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx Sprint 7 spec avatar video generation
// 4) TRPCError NOT_IMPLEMENTED en cada función principal (no throw genérico)

import { TRPCError } from '@trpc/server';

export const STUB_MESSAGE =
  'HeyGen avatar video generation shipping en Sprint 7 H2 (BIBLIA v4 spec).';

// TODO Sprint 7 (BIBLIA v4 §7 Avatar narrador):
// - Provisionar HEYGEN_API_KEY en Vercel env (verify-before-spend canon)
// - Seleccionar avatar canon DMX en HeyGen studio (avatar_id estable)
// - Validar voice_id default (compatible es-MX) o pasar audio externo de ElevenLabs
// - Integration: POST https://api.heygen.com/v2/video/generate
//   body: { video_inputs: [{ character: { type: 'avatar', avatar_id, avatar_style }, voice }] }
// - Polling status: GET https://api.heygen.com/v1/video_status.get?video_id=
// - Wrap calls en sentry.captureException con tags { feature: 'dmx-studio.heygen' }

export async function generateAvatarVideo(_input: unknown): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function testConnection(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: 'STUB H2 Sprint 7 HeyGen avatar' };
}
