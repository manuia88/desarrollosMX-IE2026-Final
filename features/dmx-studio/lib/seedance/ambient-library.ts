// F14.F.7 Sprint 6 BIBLIA v4 §6 — Audio ambient library helpers (Upgrade 4 / Tarea 6.4).
// DMX Studio dentro DMX único entorno (ADR-054).
// Pure helpers: schema validation + scene→ambient suggestion.
// No supabase imports — DB access lives in trpc routes.

import { z } from 'zod';

export const AmbientPresetSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  context_tags: z.array(z.string()),
  storage_path: z.string().min(1),
  duration_seconds: z.number(),
  is_active: z.boolean(),
  meta: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
});

export type AmbientPreset = z.infer<typeof AmbientPresetSchema>;

export const CANON_AMBIENT_SLUGS = [
  'ocean_view',
  'downtown_busy',
  'garden_birds',
  'kitchen_modern',
  'fireplace_cozy',
  'park_kids',
  'rooftop_wind',
  'pool_water',
  'rain_window',
  'cafe_chatter',
  'forest_morning',
  'office_open',
] as const;

export type CanonAmbientSlug = (typeof CANON_AMBIENT_SLUGS)[number];

const SCENE_TO_AMBIENT: Record<string, CanonAmbientSlug> = {
  cocina: 'kitchen_modern',
  jardin: 'garden_birds',
  agua: 'pool_water',
  alberca: 'pool_water',
  mar: 'ocean_view',
  vista_mar: 'ocean_view',
  calle: 'downtown_busy',
  urbano: 'downtown_busy',
  centro: 'downtown_busy',
  parque: 'park_kids',
  bosque: 'forest_morning',
  naturaleza: 'forest_morning',
  terraza: 'rooftop_wind',
  rooftop: 'rooftop_wind',
  chimenea: 'fireplace_cozy',
  sala: 'fireplace_cozy',
  oficina: 'office_open',
  cafe: 'cafe_chatter',
  cafeteria: 'cafe_chatter',
  lluvia: 'rain_window',
  recamara: 'rain_window',
  bano: 'rain_window',
};

const DEFAULT_FALLBACK: CanonAmbientSlug = 'forest_morning';

export function suggestAmbientForScene(sceneType: string): CanonAmbientSlug {
  const key = sceneType.trim().toLowerCase();
  return SCENE_TO_AMBIENT[key] ?? DEFAULT_FALLBACK;
}

export function isCanonAmbientSlug(slug: string): slug is CanonAmbientSlug {
  return (CANON_AMBIENT_SLUGS as readonly string[]).includes(slug);
}
