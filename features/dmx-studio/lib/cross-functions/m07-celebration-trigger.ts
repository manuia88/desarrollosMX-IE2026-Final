// F14.F.7 Sprint 6 UPGRADE 10 CROSS-FN — M07 Celebration video trigger.
// Pure helpers + payload builder para el handoff entre M07 (cierre operación)
// y Studio (auto-generación celebration video opt-in). Privacy-first:
// solo cuando user_opt_in === true se construye el payload.
//
// Patrón canon (ADR-053): adaptador vive en dmx-studio (owner del proyecto
// resultante). M07 service-layer importa estas funciones, decide trigger,
// y hace el INSERT real en `studio_projects` (owned por M21). Esta capa
// sólo VALIDA y CONSTRUYE — cero supabase calls aquí.

import { z } from 'zod';

export const M07CelebrationInputSchema = z.object({
  operacionId: z.string().uuid(),
  userId: z.string().uuid(),
  propertyType: z.string().min(1),
  userOptIn: z.boolean(),
});

export type M07CelebrationInput = z.infer<typeof M07CelebrationInputSchema>;

export const M07CelebrationPayloadInputSchema = M07CelebrationInputSchema.pick({
  operacionId: true,
  userId: true,
  propertyType: true,
});

export type M07CelebrationPayloadInput = z.infer<typeof M07CelebrationPayloadInputSchema>;

export const CELEBRATION_TRIGGER_OPT_IN_KEY = 'studio_m07_celebration_opt_in' as const;

export interface CelebrationProjectPayload {
  readonly project_type: string;
  readonly meta: Record<string, unknown>;
}

/**
 * Privacy-first canon: la celebración solo se dispara si el user activó
 * el opt-in en sus preferencias (clave canónica `CELEBRATION_TRIGGER_OPT_IN_KEY`).
 * El default DEBE ser opt-in === false (responsabilidad del caller leer la pref
 * desde profiles.meta o user_preferences y pasarla aquí).
 */
export function shouldTriggerCelebrationVideo(input: M07CelebrationInput): boolean {
  const parsed = M07CelebrationInputSchema.parse(input);
  return parsed.userOptIn === true;
}

/**
 * Construye el payload listo para `studio_projects.insert(...)`. M07 service
 * decide opt-in con `shouldTriggerCelebrationVideo`, llama esto, y persiste.
 *
 * Convención meta:
 *  - source_operacion_id → backref hacia M07 (auditable).
 *  - drone_pattern: 'reveal' → patrón cinematográfico canon celebración (Sprint 6).
 *  - seedance_ambient: 'auto' → engine elige ambient music según propertyType.
 *  - branded_overlay: true → overlay DMX brand (logo + asesor name).
 *  - auto_generated: true → flag para distinguir de proyectos manuales en métricas.
 */
export function buildCelebrationProjectPayload(
  input: M07CelebrationPayloadInput,
): CelebrationProjectPayload {
  const parsed = M07CelebrationPayloadInputSchema.parse(input);
  return {
    project_type: 'celebration',
    meta: {
      source_operacion_id: parsed.operacionId,
      source_user_id: parsed.userId,
      property_type: parsed.propertyType,
      drone_pattern: 'reveal',
      seedance_ambient: 'auto',
      branded_overlay: true,
      auto_generated: true,
    },
  };
}
