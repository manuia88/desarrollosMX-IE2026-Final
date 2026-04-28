import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/desarrollos-cross-feature', () => ({
  hasMinimumPhotosForSeries: vi.fn(),
}));

import { hasMinimumPhotosForSeries } from '@/shared/lib/desarrollos-cross-feature';
import {
  buildCreateSeriesUrl,
  checkCreateSeriesButtonEligibility,
} from '../m02-create-series-button';

describe('m02-create-series-button F14.F.9 Upgrade 9', () => {
  it('eligible cuando >=5 fotos', async () => {
    vi.mocked(hasMinimumPhotosForSeries).mockResolvedValue(true);
    const r = await checkCreateSeriesButtonEligibility('p-1');
    expect(r.eligible).toBe(true);
    expect(r.reason).toBe('enough_photos');
    expect(r.threshold).toBe(5);
  });

  it('not eligible cuando <5 fotos', async () => {
    vi.mocked(hasMinimumPhotosForSeries).mockResolvedValue(false);
    const r = await checkCreateSeriesButtonEligibility('p-1');
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('not_enough_photos');
  });

  it('buildCreateSeriesUrl arma URL con query desarrollo_id', () => {
    const url = buildCreateSeriesUrl('es-MX', 'des-123');
    expect(url).toBe('/es-MX/studio-app/series/new?desarrollo_id=des-123');
  });
});
