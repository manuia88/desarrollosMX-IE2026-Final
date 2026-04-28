// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 2 — Multi-batch orchestrator (pure plan).
// DMX Studio dentro DMX único entorno (ADR-054). Splits/validates input.
// Actual API call lives in lib/virtual-staging/index.ts batchStage.

export const MULTI_BATCH_MAX_ASSETS = 20;

export interface BatchPlanAsset {
  readonly id: string;
  readonly storage_url: string;
}

export interface BatchPlanSlot {
  readonly assetId: string;
  readonly imageUrl: string;
}

export interface BatchPlan {
  readonly totalAssets: number;
  readonly batchSlots: ReadonlyArray<BatchPlanSlot>;
}

export function prepareBatchPlan(assets: ReadonlyArray<BatchPlanAsset>): BatchPlan {
  const validated = assets.filter(
    (a) => typeof a.id === 'string' && a.id.length > 0 && typeof a.storage_url === 'string' && a.storage_url.length > 0,
  );
  const capped = validated.slice(0, MULTI_BATCH_MAX_ASSETS);
  const batchSlots: BatchPlanSlot[] = capped.map((a) => ({
    assetId: a.id,
    imageUrl: a.storage_url,
  }));
  return {
    totalAssets: batchSlots.length,
    batchSlots,
  };
}
