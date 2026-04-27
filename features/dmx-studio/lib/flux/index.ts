// FASE 14.F.0 (Sprint 6 H2 BIBLIA v4) — DMX Studio dentro DMX único entorno (ADR-054).
// STUB ADR-018 — activar Sprint 6 vía fal-gateway (no SDK directo). Frame base + upscale Flux.
// 4 señales:
// 1) este comentario top
// 2) UI badge [próximamente · Sprint 6] cuando feature toggle off (SEEDANCE_ENABLED downstream)
// 3) docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx Sprint 6 spec frame generation + upscale
// 4) TRPCError NOT_IMPLEMENTED en cada función principal (no throw genérico)

import { TRPCError } from '@trpc/server';

export const STUB_MESSAGE =
  'Flux frame+upscale shipping en Sprint 6 H2 vía fal-gateway (BIBLIA v4 spec).';

// TODO Sprint 6 (BIBLIA v4 §6 Generación visual / Frame base):
// - Activar vía fal-gateway (fal-gateway/index.ts) — NO instanciar SDK directo
// - Models canon: fal-ai/flux/dev (alta calidad, costo medio)
//                 fal-ai/flux/schnell (rápido, costo bajo, draft)
//                 fal-ai/flux-realism (foto-realismo arquitectónico)
// - generateFrame: input { prompt, image_size, num_inference_steps, seed? }
// - upscale: input { imageUrl, scale: 2|4 } → fal-ai/clarity-upscaler u equivalente
// - Integration: import { generateFromModel } from '../fal-gateway' — gateway routing
// - Wrap calls en sentry.captureException con tags { feature: 'dmx-studio.flux' }

export async function generateFrame(_input: unknown): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function upscale(_input: unknown): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function testConnection(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: 'STUB H2 Sprint 6 Flux frame+upscale' };
}
