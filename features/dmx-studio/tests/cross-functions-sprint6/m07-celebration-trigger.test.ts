// F14.F.7 Sprint 6 — Tests M07 Celebration trigger cross-fn (privacy-first canon).

import { describe, expect, it } from 'vitest';
import {
  CELEBRATION_TRIGGER_OPT_IN_KEY,
  M07CelebrationInputSchema,
  buildCelebrationProjectPayload,
  shouldTriggerCelebrationVideo,
} from '@/features/dmx-studio/lib/cross-functions/m07-celebration-trigger';

const OPERACION_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';

describe('shouldTriggerCelebrationVideo', () => {
  it('returns false when userOptIn === false (privacy-first default)', () => {
    expect(
      shouldTriggerCelebrationVideo({
        operacionId: OPERACION_ID,
        userId: USER_ID,
        propertyType: 'casa',
        userOptIn: false,
      }),
    ).toBe(false);
  });

  it('returns true only when userOptIn === true', () => {
    expect(
      shouldTriggerCelebrationVideo({
        operacionId: OPERACION_ID,
        userId: USER_ID,
        propertyType: 'departamento',
        userOptIn: true,
      }),
    ).toBe(true);
  });
});

describe('buildCelebrationProjectPayload', () => {
  it('builds canonical payload with project_type=celebration + canon meta keys', () => {
    const payload = buildCelebrationProjectPayload({
      operacionId: OPERACION_ID,
      userId: USER_ID,
      propertyType: 'casa',
    });
    expect(payload.project_type).toBe('celebration');
    expect(payload.meta.source_operacion_id).toBe(OPERACION_ID);
    expect(payload.meta.source_user_id).toBe(USER_ID);
    expect(payload.meta.property_type).toBe('casa');
    expect(payload.meta.drone_pattern).toBe('reveal');
    expect(payload.meta.seedance_ambient).toBe('auto');
    expect(payload.meta.branded_overlay).toBe(true);
    expect(payload.meta.auto_generated).toBe(true);
  });
});

describe('M07CelebrationInputSchema', () => {
  it('rejects invalid operacionId (not uuid)', () => {
    expect(() =>
      M07CelebrationInputSchema.parse({
        operacionId: 'not-a-uuid',
        userId: USER_ID,
        propertyType: 'casa',
        userOptIn: true,
      }),
    ).toThrow();
  });

  it('exposes canon opt-in key constant for caller preference reads', () => {
    expect(CELEBRATION_TRIGGER_OPT_IN_KEY).toBe('studio_m07_celebration_opt_in');
  });
});
