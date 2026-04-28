// F14.F.7 Sprint 6 — Tests M02 Virtual Staging bridge cross-fn.

import { describe, expect, it } from 'vitest';
import {
  buildVirtualStagingDeepLink,
  M02BridgeInputSchema,
  shouldShowVirtualStagingButton,
} from '@/features/dmx-studio/lib/cross-functions/m02-virtual-staging-bridge';

const DESARROLLO_ID = '11111111-1111-4111-8111-111111111111';
const ASSET_A = '22222222-2222-4222-8222-222222222222';
const ASSET_B = '33333333-3333-4333-8333-333333333333';

describe('shouldShowVirtualStagingButton', () => {
  it('returns false when no empty room assets even with paid plan', () => {
    expect(
      shouldShowVirtualStagingButton({
        hasEmptyRoomAssets: false,
        userPlan: 'studio_pro',
      }),
    ).toBe(false);
  });

  it('returns true for empty room + studio_pro plan', () => {
    expect(
      shouldShowVirtualStagingButton({
        hasEmptyRoomAssets: true,
        userPlan: 'studio_pro',
      }),
    ).toBe(true);
  });

  it('returns false for free/null plan even with empty room assets', () => {
    expect(
      shouldShowVirtualStagingButton({
        hasEmptyRoomAssets: true,
        userPlan: null,
      }),
    ).toBe(false);
    expect(
      shouldShowVirtualStagingButton({
        hasEmptyRoomAssets: true,
        userPlan: 'free',
      }),
    ).toBe(false);
  });

  it('rejects malformed input via Zod schema', () => {
    expect(() =>
      M02BridgeInputSchema.parse({ hasEmptyRoomAssets: 'yes', userPlan: 'studio_pro' }),
    ).toThrow();
  });
});

describe('buildVirtualStagingDeepLink', () => {
  it('builds canonical deep link with desarrollo id only', () => {
    const url = buildVirtualStagingDeepLink({ desarrolloId: DESARROLLO_ID });
    expect(url).toBe(`/studio-app/virtual-staging/new?from_desarrollo=${DESARROLLO_ID}`);
  });

  it('appends comma-separated asset ids when provided', () => {
    const url = buildVirtualStagingDeepLink({
      desarrolloId: DESARROLLO_ID,
      assetIds: [ASSET_A, ASSET_B],
    });
    expect(url).toContain(`from_desarrollo=${DESARROLLO_ID}`);
    expect(url).toContain(`assets=${ASSET_A}%2C${ASSET_B}`);
  });
});
