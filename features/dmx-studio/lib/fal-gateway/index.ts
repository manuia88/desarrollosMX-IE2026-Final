// FASE 14.F.0 (Sprint 6 H2 BIBLIA v4) — DMX Studio dentro DMX único entorno (ADR-054).
// STUB ADR-018 — activar Sprint 6 cuando fal.ai API key provisionada + Seedance 2.0 + Flux endpoints disponibles.
// 4 señales:
// 1) este comentario top
// 2) UI badge [próximamente · Sprint 6] cuando feature toggle off (SEEDANCE_ENABLED / VIRTUAL_STAGING_ENABLED)
// 3) docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx Sprint 6 spec multi-modelo gateway
// 4) TRPCError NOT_IMPLEMENTED en cada función principal (no throw genérico)

import { TRPCError } from '@trpc/server';

export const STUB_MESSAGE =
  'fal-gateway integration shipping en Sprint 6 H2 (BIBLIA v4 spec multi-modelo unified API).';

export type FalModelKey = 'seedance' | 'flux';

// TODO Sprint 6 (BIBLIA v4 §6 Generación visual):
// - Provisionar FAL_KEY en Vercel env (verify-before-spend canon)
// - Validar Seedance 2.0 disponible público en fal.ai (modelo: fal-ai/seedance-v2)
// - Validar Flux endpoints fal-ai/flux/dev + fal-ai/flux/schnell + fal-ai/flux-realism
// - Integration: client = createFalClient({ credentials: process.env.FAL_KEY });
//   fal.subscribe('fal-ai/seedance-v2', { input }) — pattern subscribe + onQueueUpdate
// - Wrap calls en sentry.captureException con tags { feature: 'dmx-studio.fal-gateway' }
// - Cost tracking: emitir studio_runs con cost_usd estimado por modelo

export async function generateFromModel(_modelKey: FalModelKey, _input: unknown): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function testConnection(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: 'STUB H2 Sprint 6 fal-gateway' };
}
