// F14.F.7 Sprint 6 UPGRADE 9 CROSS-FN — M02 Virtual Staging bridge.
// Pure helpers consumidos por features/asesor-desarrollos (M02) para detectar
// cuándo mostrar el CTA "Generar Virtual Staging" en cards/listados de
// desarrollos con renders/fotos vacías + construir deep link a Studio.
//
// Patrón canon (ADR-053 + ADR-050 + canon memory rule cross-features):
//   Adaptador vive en dmx-studio (owner). Feature externa consume vía
//   `import type` + import de funciones puras. Cero side-effects, cero
//   supabase queries — sólo lógica determinista.

import { z } from 'zod';

export const M02BridgeInputSchema = z.object({
  hasEmptyRoomAssets: z.boolean(),
  userPlan: z.string().nullable(),
});

export type M02BridgeInput = z.infer<typeof M02BridgeInputSchema>;

export const M02DeepLinkInputSchema = z.object({
  desarrolloId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()).optional(),
});

export type M02DeepLinkInput = z.infer<typeof M02DeepLinkInputSchema>;

const PLANS_WITH_VIRTUAL_STAGING: ReadonlySet<string> = new Set([
  'studio_pro',
  'studio_business',
  'studio_enterprise',
]);

/**
 * Decide si el botón "Virtual Staging" debe mostrarse en la card del desarrollo.
 * Reglas:
 *  - Requiere al menos un asset detectado como "empty room" (input upstream).
 *  - Requiere plan compatible (free/trial NO ven CTA — se ofrece upgrade vía M11).
 *  - Si plan es null (anónimo) → false.
 */
export function shouldShowVirtualStagingButton(input: M02BridgeInput): boolean {
  const parsed = M02BridgeInputSchema.parse(input);
  if (!parsed.hasEmptyRoomAssets) return false;
  if (parsed.userPlan === null) return false;
  return PLANS_WITH_VIRTUAL_STAGING.has(parsed.userPlan);
}

/**
 * Construye URL relativa hacia el flujo Studio Virtual Staging con contexto
 * pre-cargado del desarrollo origen. Asset IDs opcionales para pre-selección
 * en el picker. Caller (M02) debe usar el router Next.js con esta URL.
 */
export function buildVirtualStagingDeepLink(input: M02DeepLinkInput): string {
  const parsed = M02DeepLinkInputSchema.parse(input);
  const params = new URLSearchParams();
  params.set('from_desarrollo', parsed.desarrolloId);
  if (parsed.assetIds && parsed.assetIds.length > 0) {
    params.set('assets', parsed.assetIds.join(','));
  }
  return `/studio-app/virtual-staging/new?${params.toString()}`;
}
