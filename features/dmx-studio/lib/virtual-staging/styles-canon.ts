// F14.F.7 Sprint 6 BIBLIA v4 §6 — Virtual Staging styles canon (5 presets UI).
// DMX Studio dentro DMX único entorno (ADR-054). Pure constants + lookup helper.

export const STAGING_STYLES_CANON = [
  {
    slug: 'modern',
    name: 'Moderno',
    description: 'Líneas limpias, neutros, maderas claras',
    tone: 'neutral',
  },
  {
    slug: 'classic',
    name: 'Clásico',
    description: 'Madera oscura, textiles ricos, ornamentos',
    tone: 'warm',
  },
  {
    slug: 'minimalist',
    name: 'Minimalista',
    description: 'White-pure, acero, zen',
    tone: 'cool',
  },
  {
    slug: 'luxury',
    name: 'Lujoso',
    description: 'Mármol, metales dorados, textiles premium',
    tone: 'gold',
  },
  {
    slug: 'family',
    name: 'Familiar',
    description: 'Cálido, colores cómodos, textiles acogedores',
    tone: 'warm',
  },
] as const;

export type StagingStyleCanon = (typeof STAGING_STYLES_CANON)[number];

export function getStyleBySlug(slug: string): StagingStyleCanon | null {
  const found = STAGING_STYLES_CANON.find((s) => s.slug === slug);
  return found ?? null;
}
