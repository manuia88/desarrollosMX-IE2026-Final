// F14.F.8 Sprint 7 BIBLIA Upgrade 5 — Smart zone selector top 3 zones per asesor.

import {
  suggestZonesForAsesor as ieSuggest,
  type SuggestedZone,
} from '@/shared/lib/ie-cross-feature';

export type { SuggestedZone };

export async function suggestZonesForAsesor(userId: string): Promise<ReadonlyArray<SuggestedZone>> {
  return ieSuggest(userId);
}
