// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 2 — Multi-batch orchestrator pure plan tests.
// DMX Studio dentro DMX único entorno (ADR-054).

import { describe, expect, it } from 'vitest';

import {
  MULTI_BATCH_MAX_ASSETS,
  prepareBatchPlan,
} from '@/features/dmx-studio/lib/virtual-staging/multi-staging-batch';

describe('virtual-staging.multi-staging-batch', () => {
  it('builds plan from valid assets, mapping id+storage_url to slots', () => {
    const plan = prepareBatchPlan([
      { id: 'a1', storage_url: 'https://example.com/1.jpg' },
      { id: 'a2', storage_url: 'https://example.com/2.jpg' },
    ]);
    expect(plan.totalAssets).toBe(2);
    expect(plan.batchSlots).toHaveLength(2);
    expect(plan.batchSlots[0]).toEqual({
      assetId: 'a1',
      imageUrl: 'https://example.com/1.jpg',
    });
  });

  it('drops assets with missing id or storage_url', () => {
    const plan = prepareBatchPlan([
      { id: 'a1', storage_url: 'https://example.com/1.jpg' },
      { id: '', storage_url: 'https://example.com/2.jpg' },
      { id: 'a3', storage_url: '' },
    ]);
    expect(plan.totalAssets).toBe(1);
    expect(plan.batchSlots).toHaveLength(1);
    expect(plan.batchSlots[0]?.assetId).toBe('a1');
  });

  it(`caps batch size to MULTI_BATCH_MAX_ASSETS (${MULTI_BATCH_MAX_ASSETS})`, () => {
    const overflow = Array.from({ length: MULTI_BATCH_MAX_ASSETS + 5 }, (_, i) => ({
      id: `a${i}`,
      storage_url: `https://example.com/${i}.jpg`,
    }));
    const plan = prepareBatchPlan(overflow);
    expect(plan.totalAssets).toBe(MULTI_BATCH_MAX_ASSETS);
    expect(plan.batchSlots).toHaveLength(MULTI_BATCH_MAX_ASSETS);
  });
});
