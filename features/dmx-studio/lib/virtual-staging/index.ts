// FASE 14.F.0 (Sprint 6 H2 BIBLIA v4) — DMX Studio dentro DMX único entorno (ADR-054).
// STUB ADR-018 — activar Sprint 6 cuando PEDRA_API_KEY o VIRTUALSTAGINGAI_KEY provisionado.
// 4 señales:
// 1) este comentario top
// 2) UI badge [próximamente · Sprint 6] cuando feature toggle off (VIRTUAL_STAGING_ENABLED)
// 3) docs/M21_STUDIO/BIBLIA_DMX_STUDIO_v4.docx Sprint 6 spec amueblar espacios vacios
// 4) TRPCError NOT_IMPLEMENTED en cada función principal (no throw genérico)

import { TRPCError } from '@trpc/server';

export const STUB_MESSAGE =
  'Virtual staging integration shipping en Sprint 6 H2 (BIBLIA v4 spec amueblado AI).';

export interface StageRoomInput {
  imageUrl: string;
  style: string;
}

// TODO Sprint 6 (BIBLIA v4 §6 Generación visual / Virtual staging):
// - Decisión proveedor: Pedra.so vs VirtualStagingAI vs equivalent (verify-before-spend pricing dashboard)
// - Provisionar PEDRA_API_KEY o VIRTUALSTAGINGAI_KEY en Vercel env
// - Style canon: modern | scandinavian | industrial | luxury (mapear a tokens DMX)
// - Cost: ~$0.50-2/render (validar con dashboard real antes de hardcodear)
// - Integration: POST proveedor /render con { image_url, style, room_type }
// - Polling status until 'completed' → return rendered_image_url
// - Wrap calls en sentry.captureException con tags { feature: 'dmx-studio.virtual-staging' }

export async function stageRoom(_input: StageRoomInput): Promise<never> {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE });
}

export async function testConnection(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: 'STUB H2 Sprint 6 Virtual Staging' };
}
