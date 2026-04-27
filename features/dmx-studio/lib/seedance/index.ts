// FASE 14.F.0 (Sprint 6 H2 BIBLIA v4) — DMX Studio dentro DMX único entorno (ADR-054).
// STUB ADR-018 — activar Sprint 6 vía fal-gateway. Seedance 2.0 video con audio ambiente.
// 4 señales:
// 1) este comentario top
// 2) UI badge [próximamente · Sprint 6] cuando feature toggle off (SEEDANCE_ENABLED)
// 3) docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx Sprint 6 spec video cinematográfico + audio nativo
// 4) TRPCError NOT_IMPLEMENTED en cada función principal (no throw genérico)

import { TRPCError } from '@trpc/server';

export const STUB_MESSAGE =
  'Seedance video+audio shipping en Sprint 6 H2 vía fal-gateway (BIBLIA v4 spec).';

// TODO Sprint 6 (BIBLIA v4 §6 Generación visual / Video cinematográfico):
// - Activar vía fal-gateway (fal-gateway/index.ts) — NO instanciar SDK directo
// - Model canon: fal-ai/seedance-v2 (Seedance 2.0 con audio ambiente nativo)
// - Output: video 5-10s cinematic + soundtrack ambiente embebido
// - Cost: ~$0.40/clip 5s (verify-before-spend con dashboard fal.ai pricing real)
// - Integration: import { generateFromModel } from '../fal-gateway'
//                generateFromModel('seedance', { prompt, duration_seconds, aspect_ratio, image_url? })
// - Wrap calls en sentry.captureException con tags { feature: 'dmx-studio.seedance' }
// - Cost tracking: emitir studio_runs con cost_usd estimado por duración

export async function generateVideoWithAudio(_input: unknown): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function testConnection(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: 'STUB H2 Sprint 6 Seedance via fal.ai' };
}
