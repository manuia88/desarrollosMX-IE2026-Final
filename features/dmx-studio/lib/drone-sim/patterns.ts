// F14.F.7 Sprint 6 — Drone simulation patterns canon (4 entries).
// Pure data + lookup helper, no IO.

export interface DronePatternCanon {
  readonly slug: 'orbital' | 'flyover' | 'approach' | 'reveal';
  readonly name: string;
  readonly description: string;
  readonly defaultDurationSeconds: number;
}

export const DRONE_PATTERNS_CANON: readonly DronePatternCanon[] = [
  {
    slug: 'orbital',
    name: 'Orbital',
    description: 'Cámara 360° alrededor del sujeto',
    defaultDurationSeconds: 8,
  },
  {
    slug: 'flyover',
    name: 'Flyover',
    description: 'Top-down avanzando hacia adelante',
    defaultDurationSeconds: 6,
  },
  {
    slug: 'approach',
    name: 'Aproximación',
    description: 'Zoom in hacia entrada',
    defaultDurationSeconds: 5,
  },
  {
    slug: 'reveal',
    name: 'Reveal',
    description: 'Comienza cerrado, abre a panorámica',
    defaultDurationSeconds: 7,
  },
] as const;

export function getPatternBySlug(slug: string): DronePatternCanon | null {
  const found = DRONE_PATTERNS_CANON.find((p) => p.slug === slug);
  return found ?? null;
}
