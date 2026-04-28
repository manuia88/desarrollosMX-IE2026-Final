import { describe, expect, it } from 'vitest';
import {
  isMarketingExportFeatureLive,
  triggerMarketingDevExport,
} from '../m14-marketing-dev-export';

describe('m14-marketing-dev-export STUB ADR-018 F14.F.9', () => {
  it('isMarketingExportFeatureLive false H1 (STUB)', () => {
    expect(isMarketingExportFeatureLive()).toBe(false);
  });

  it('triggerMarketingDevExport returns NOT_IMPLEMENTED', async () => {
    const r = await triggerMarketingDevExport({
      seriesId: '123e4567-e89b-42d3-a456-426614174000',
      campaignId: '123e4567-e89b-42d3-a456-426614174001',
      episodeIds: ['123e4567-e89b-42d3-a456-426614174002'],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOT_IMPLEMENTED');
    expect(r.message).toContain('FASE 15');
  });
});
