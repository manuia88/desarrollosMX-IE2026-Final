// F14.F.9 Sprint 8 BIBLIA Upgrade 9 vía ADR-056 — M02 Desarrollos "Crear Serie" eligibility helper.
// Pure helper (read-only) que consume shared/lib/desarrollos-cross-feature.

import { hasMinimumPhotosForSeries } from '@/shared/lib/desarrollos-cross-feature';

export interface CreateSeriesButtonEligibilityResult {
  readonly eligible: boolean;
  readonly reason: 'enough_photos' | 'not_enough_photos';
  readonly threshold: number;
  readonly desarrolloId: string;
}

const PHOTOS_THRESHOLD = 5;

export async function checkCreateSeriesButtonEligibility(
  desarrolloId: string,
): Promise<CreateSeriesButtonEligibilityResult> {
  const eligible = await hasMinimumPhotosForSeries(desarrolloId, PHOTOS_THRESHOLD);
  return {
    eligible,
    reason: eligible ? 'enough_photos' : 'not_enough_photos',
    threshold: PHOTOS_THRESHOLD,
    desarrolloId,
  };
}

export function buildCreateSeriesUrl(locale: string, desarrolloId: string): string {
  const params = new URLSearchParams({ desarrollo_id: desarrolloId });
  return `/${locale}/studio-app/series/new?${params.toString()}`;
}
