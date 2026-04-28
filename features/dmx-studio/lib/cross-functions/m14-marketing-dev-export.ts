// F14.F.9 Sprint 8 BIBLIA Upgrade 10 vía ADR-056 — M14 Marketing Dev export STUB.
// STUB ADR-018 — activar FASE 15 cuando M14 Marketing Dev shipped.
// Wrapper que delega en shared/lib/marketing-dev-cross-feature (también STUB).

import {
  exportSeriesToMarketingCampaign,
  isMarketingDevReady,
  type SeriesExportToCampaignInput,
} from '@/shared/lib/marketing-dev-cross-feature';

export async function triggerMarketingDevExport(
  input: SeriesExportToCampaignInput,
): Promise<{ ok: false; reason: 'NOT_IMPLEMENTED'; message: string }> {
  // STUB ADR-018 — flip cuando shared/lib/marketing-dev-cross-feature isMarketingDevReady() === true.
  if (isMarketingDevReady()) {
    // Future-proof: reach this branch en FASE 15 cuando STUB se reemplace.
    const result = await exportSeriesToMarketingCampaign(input);
    if (result.ok === false) return result;
  }
  return {
    ok: false,
    reason: 'NOT_IMPLEMENTED',
    message:
      'Export Marketing Dev disponible en FASE 15 cuando M14 shipped. UI muestra disclosure ADR-018.',
  };
}

export function isMarketingExportFeatureLive(): boolean {
  return isMarketingDevReady();
}
