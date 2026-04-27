// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Tests STUB ADR-018 trust-score-boost: returns applied=false con reason canon.

import { describe, expect, it } from 'vitest';

import {
  applyTrustScoreBoostFromStudio,
  STUDIO_TRUST_BOOST_POINTS,
  STUDIO_TRUST_BOOST_THRESHOLD_PUBLISHED_VIDEOS,
} from '@/features/dmx-studio/lib/cross-functions/trust-score-boost';

describe('applyTrustScoreBoostFromStudio STUB ADR-018', () => {
  it('returns applied=false with STUB-NOT-ACTIVE reason and canon boost+threshold', async () => {
    const result = await applyTrustScoreBoostFromStudio(null, 'desa-001');
    expect(result.applied).toBe(false);
    expect(result.reason).toContain('STUB-NOT-ACTIVE');
    expect(result.reason).toContain('L-NEW-STUDIO-TRUST-BOOST');
    expect(result.reason).toContain('F14.F.2');
    expect(result.boostPoints).toBe(STUDIO_TRUST_BOOST_POINTS);
    expect(result.boostPoints).toBe(5);
    expect(result.threshold).toBe(STUDIO_TRUST_BOOST_THRESHOLD_PUBLISHED_VIDEOS);
    expect(result.threshold).toBe(1);
  });
});
