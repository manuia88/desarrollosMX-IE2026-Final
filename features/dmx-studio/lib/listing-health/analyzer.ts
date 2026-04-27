// F14.F.4 Sprint 3 UPGRADE 5 — Listing Health Score (pure JS, zero LLM cost).
//
// Computa score 0-100 weighted average de 4 dimensiones + suggestions
// accionables. Asesor ve badge en UrlPreviewCard antes confirmar generate.

import type { ExtractedListingData } from '@/features/dmx-studio/lib/url-import';

export interface HealthScoreBreakdown {
  readonly scoreOverall: number;
  readonly scorePhotosCount: number;
  readonly scoreDescriptionLength: number;
  readonly scoreMissingFields: number;
  readonly scoreMetadataQuality: number;
  readonly missingFields: ReadonlyArray<string>;
  readonly improvementSuggestions: ReadonlyArray<string>;
}

const PHOTOS_TARGET = 10;
const PHOTOS_MIN_OK = 5;
const DESC_TARGET = 200;
const DESC_MIN_OK = 100;

const CRITICAL_FIELDS = [
  'priceLocal',
  'areaM2',
  'bedrooms',
  'bathrooms',
  'zone',
] as const satisfies ReadonlyArray<keyof ExtractedListingData>;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function analyzeListingHealth(data: ExtractedListingData): HealthScoreBreakdown {
  const photos = data.photos.length;
  const scorePhotosCount = clamp(
    photos >= PHOTOS_TARGET ? 100 : photos >= PHOTOS_MIN_OK ? 60 : photos >= 1 ? 30 : 0,
  );

  const descLen = data.description?.length ?? 0;
  const scoreDescriptionLength = clamp(
    descLen >= DESC_TARGET ? 100 : descLen >= DESC_MIN_OK ? 60 : descLen >= 30 ? 30 : 0,
  );

  const missingFields = CRITICAL_FIELDS.filter((f) => data[f] === null || data[f] === undefined);
  const presentRatio = (CRITICAL_FIELDS.length - missingFields.length) / CRITICAL_FIELDS.length;
  const scoreMissingFields = clamp(presentRatio * 100);

  const hasJsonLd = Boolean(data.rawMetadata?.jsonLdFound);
  const hasOgLocale = Boolean(data.rawMetadata?.ogLocale);
  const hasAmenities = data.amenities.length > 0;
  const metadataPoints = (hasJsonLd ? 50 : 0) + (hasOgLocale ? 25 : 0) + (hasAmenities ? 25 : 0);
  const scoreMetadataQuality = clamp(metadataPoints);

  const scoreOverall = clamp(
    scorePhotosCount * 0.3 +
      scoreDescriptionLength * 0.25 +
      scoreMissingFields * 0.3 +
      scoreMetadataQuality * 0.15,
  );

  const suggestions: string[] = [];
  if (photos < PHOTOS_TARGET) {
    suggestions.push(
      `Agrega más fotos: tienes ${photos}, recomendado ${PHOTOS_TARGET}+ para mejor performance video.`,
    );
  }
  if (descLen < DESC_TARGET) {
    suggestions.push(
      `Amplía la descripción: tienes ${descLen} chars, recomendado ${DESC_TARGET}+ para SEO portales.`,
    );
  }
  if (missingFields.length > 0) {
    suggestions.push(
      `Completa los campos: ${missingFields.join(', ')} para mejorar matching con búsquedas.`,
    );
  }
  if (!hasAmenities) {
    suggestions.push('Lista las amenidades del inmueble para hooks distintivos en el video.');
  }
  if (!hasJsonLd) {
    suggestions.push(
      'El listing original no tiene metadata estructurada (JSON-LD). Verifica el portal.',
    );
  }

  return {
    scoreOverall,
    scorePhotosCount,
    scoreDescriptionLength,
    scoreMissingFields,
    scoreMetadataQuality,
    missingFields: missingFields.map(String),
    improvementSuggestions: suggestions,
  };
}
