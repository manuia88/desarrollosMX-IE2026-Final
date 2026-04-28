// F14.F.11 Sprint 10 BIBLIA Tarea 10.3 — Beta outreach activation STUB.
//
// SEÑAL 1 (STUB ADR-018) — Beta outreach H2 cuando founder tenga base 50+
// asesores invitados. Materiales (templates Resend, docs, CSV) ya estan listos
// en docs/M21_STUDIO/beta-outreach/ + features/dmx-studio/lib/resend/templates/beta-*.tsx.
// Este modulo es el activador: hoy throws NOT_IMPLEMENTED + flag false.
//
// SEÑAL 2 — sendBetaInvite throws TRPCError NOT_IMPLEMENTED.
// SEÑAL 3 — BETA_OUTREACH_ENABLED = false (activable env var H2).
// SEÑAL 4 — L_NEW_POINTER = 'L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE'.

import { TRPCError } from '@trpc/server';

/**
 * SEÑAL 3 — Hardcoded H1 false. Activable via env var
 * `BETA_OUTREACH_ENABLED=true` cuando founder tenga base 50+ asesores
 * invitados y materiales validados manualmente.
 */
export const BETA_OUTREACH_ENABLED = false as const;

/**
 * SEÑAL 4 — L-NEW pointer canon. Cuando founder activa: editar
 * `BETA_OUTREACH_ENABLED` a `true`, reemplazar body de `sendBetaInvite` con
 * llamada real al canal Resend (`sendBetaInviteInitial` en
 * `features/dmx-studio/lib/resend/index.ts` H2 export), y conectar UI admin
 * dashboard CSV upload + send-batch trigger.
 */
export const L_NEW_POINTER = 'L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE' as const;

export interface LNewPointerDescription {
  readonly id: typeof L_NEW_POINTER;
  readonly description: string;
  readonly activateWhen: string;
  readonly activateSteps: ReadonlyArray<string>;
}

/**
 * Descripcion canonica del L-NEW pointer. Consumido por admin dashboard
 * roadmap H2 + audit-dead-ui (ADR-018 §STUBs marcados).
 */
export const L_NEW_POINTER_DESCRIPTION: LNewPointerDescription = {
  id: L_NEW_POINTER,
  description:
    'Beta outreach activation — habilitar envio de invitaciones beta privada usando ' +
    'templates Resend (beta-invite-initial, beta-onboarding-day1, beta-feedback-week2) ' +
    'y CSV invite list cargado por founder.',
  activateWhen:
    'Founder tiene base de 50+ asesores invitados validados manualmente + materiales ' +
    'aprobados + Resend SDK instalado (RESEND_API_KEY configurado en Vercel) + ' +
    'cuenta WhatsApp Business founder con numero real.',
  activateSteps: [
    '1. Validar 50+ filas en INVITE_LIST_TEMPLATE.csv (no placeholders).',
    '2. Reemplazar +52 55 XXXX XXXX con WhatsApp Business real founder.',
    '3. Configurar RESEND_API_KEY en Vercel envs (production + preview).',
    '4. Setear BETA_OUTREACH_ENABLED=true via env var (no editar codigo).',
    '5. Implementar sendBetaInvite body con sendStudioEmail wrapper canon.',
    '6. Conectar UI admin dashboard roadmap (CSV upload + batch send + status tracking).',
    '7. Probar envio a 1 email founder antes de batch real.',
    '8. Agendar cron auto follow-up Day +3 + Day +5 + Day +28.',
  ],
} as const;

export type BetaInviteVariant =
  | 'invite_initial'
  | 'follow_up_day_3'
  | 'onboarding_day_1'
  | 'check_in_week_1'
  | 'feedback_week_4';

export interface SendBetaInviteInput {
  readonly asesorEmail: string;
  readonly asesorName: string;
  readonly asesorCity: string;
  readonly variant: BetaInviteVariant;
}

/**
 * SEÑAL 2 — STUB ADR-018 — throws TRPCError NOT_IMPLEMENTED hasta L-NEW activacion.
 *
 * Llamarlo hoy retorna `NOT_IMPLEMENTED` con mensaje de validacion canon (ADR-018
 * heuristica). UI admin dashboard debe mostrar disclosure flag visible.
 *
 * @throws {TRPCError} code: 'NOT_IMPLEMENTED'.
 */
export async function sendBetaInvite(_input: SendBetaInviteInput): Promise<never> {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message:
      'Beta outreach H2 cuando founder tenga base 50+ asesores invitados — ' +
      `pointer ${L_NEW_POINTER}. Materiales listos en ` +
      'docs/M21_STUDIO/beta-outreach/ + features/dmx-studio/lib/resend/templates/beta-*.tsx.',
  });
}

export interface BetaOutreachStatus {
  readonly enabled: false;
  readonly reason: 'STUB_ADR_018_H2_FOUNDER_BASE_50_NOT_REACHED';
  readonly lNewPointer: typeof L_NEW_POINTER;
}

/**
 * Check sincronico para UI admin dashboard conditional rendering — H1 always
 * returns disabled.
 */
export function getBetaOutreachStatus(): BetaOutreachStatus {
  return {
    enabled: BETA_OUTREACH_ENABLED,
    reason: 'STUB_ADR_018_H2_FOUNDER_BASE_50_NOT_REACHED',
    lNewPointer: L_NEW_POINTER,
  };
}
