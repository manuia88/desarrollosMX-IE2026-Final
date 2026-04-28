// ADR-056 — Studio Sprint 8 cross-feature M14 Marketing Dev integration.
// STUB ADR-018 — activar FASE 15 cuando M14 Marketing Dev shipped.
// Shape canonico definido aqui para que Studio UI compile + flip-ready.

export interface SeriesExportToCampaignInput {
  readonly seriesId: string;
  readonly campaignId: string;
  readonly episodeIds: ReadonlyArray<string>;
}

export interface SeriesExportToCampaignResult {
  readonly ok: false;
  readonly reason: 'NOT_IMPLEMENTED';
  readonly message: string;
}

export interface EligibleCampaign {
  readonly id: string;
  readonly name: string;
  readonly desarrolladoraId: string;
}

export async function exportSeriesToMarketingCampaign(
  input: SeriesExportToCampaignInput,
): Promise<SeriesExportToCampaignResult> {
  // STUB ADR-018 — activar FASE 15 cuando M14 Marketing Dev shipped.
  // Heuristica detector: throw NOT_IMPLEMENTED + return shape consistente.
  void input;
  return {
    ok: false,
    reason: 'NOT_IMPLEMENTED',
    message:
      'Marketing Dev export disponible cuando M14 Marketing Dev shipped (FASE 15). Activar via flag.',
  };
}

export async function getEligibleCampaignsForSeries(
  seriesId: string,
): Promise<ReadonlyArray<EligibleCampaign>> {
  // STUB ADR-018 — activar FASE 15.
  void seriesId;
  return [];
}

export function isMarketingDevReady(): boolean {
  // STUB ADR-018 — flip a true cuando M14 Marketing Dev shipped (FASE 15).
  return false;
}
