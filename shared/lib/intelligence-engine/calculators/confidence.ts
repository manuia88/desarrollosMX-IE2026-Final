// Confidence cascade IE — helpers de detección y composición.
// Umbrales oficiales del catálogo 03.8:
//   DENUE       high ≥100 establecimientos, medium ≥20, low ≥1
//   FGJ         high ≥50 carpetas/año, medium ≥10, low ≥1
//   GTFS        high ≥3 estaciones en 1km, medium ≥1
//   SACMEX      high ≥6 meses, medium ≥3
//   macro_series high <7 días antigüedad, medium <30, low <90

import type { Confidence } from './base';

export interface VolumeThresholds {
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

export interface FreshnessThresholds {
  // Expresados en días. Para macro_series: high <7 → use high=7, medium<30 → medium=30, low<90.
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

export const CONFIDENCE_THRESHOLDS = {
  denue: { high: 100, medium: 20, low: 1 } satisfies VolumeThresholds,
  fgj: { high: 50, medium: 10, low: 1 } satisfies VolumeThresholds,
  gtfs: { high: 3, medium: 1, low: 1 } satisfies VolumeThresholds,
  sacmex: { high: 6, medium: 3, low: 1 } satisfies VolumeThresholds, // meses
} as const;

export const MACRO_FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  high: 7,
  medium: 30,
  low: 90,
};

export function detectConfidenceByVolume(count: number, thresholds: VolumeThresholds): Confidence {
  if (!Number.isFinite(count) || count < 0) return 'insufficient_data';
  if (count >= thresholds.high) return 'high';
  if (count >= thresholds.medium) return 'medium';
  if (count >= thresholds.low) return 'low';
  return 'insufficient_data';
}

// Recibe edad en días desde la última actualización. Menor = más fresco.
export function detectConfidenceByFreshness(
  lastSeenDays: number,
  thresholds: FreshnessThresholds = MACRO_FRESHNESS_THRESHOLDS,
): Confidence {
  if (!Number.isFinite(lastSeenDays) || lastSeenDays < 0) return 'insufficient_data';
  if (lastSeenDays < thresholds.high) return 'high';
  if (lastSeenDays < thresholds.medium) return 'medium';
  if (lastSeenDays < thresholds.low) return 'low';
  return 'insufficient_data';
}

// Regla: el PEOR manda. Si cualquiera es insufficient_data → insufficient_data.
const CONFIDENCE_ORDER: Record<Confidence, number> = {
  insufficient_data: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function composeConfidence(sub: readonly Confidence[]): Confidence {
  if (sub.length === 0) return 'insufficient_data';
  let worst: Confidence = 'high';
  for (const c of sub) {
    if (CONFIDENCE_ORDER[c] < CONFIDENCE_ORDER[worst]) worst = c;
  }
  return worst;
}
