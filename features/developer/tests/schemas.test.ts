import { describe, expect, it } from 'vitest';
import {
  dashboardInput,
  inventorySnapshotInput,
  kpisInput,
  morningBriefingDevInput,
  pendientesInput,
  TRUST_LEVEL,
  trustLevelEnum,
  trustScoreInput,
} from '../schemas';

describe('developer schemas', () => {
  it('TRUST_LEVEL has 4 levels', () => {
    expect(TRUST_LEVEL).toEqual(['bronze', 'silver', 'gold', 'platinum']);
    expect(trustLevelEnum.options).toHaveLength(4);
  });

  it('dashboardInput accepts empty + range', () => {
    expect(dashboardInput.parse(undefined)).toBeDefined();
    expect(dashboardInput.parse({ rangeFrom: '2026-04-01', rangeTo: '2026-04-30' })).toBeDefined();
  });

  it('dashboardInput rejects invalid date string', () => {
    expect(() => dashboardInput.parse({ rangeFrom: 'not-a-date' })).toThrow();
  });

  it('all empty schemas accept undefined', () => {
    expect(trustScoreInput.parse(undefined)).toBeDefined();
    expect(inventorySnapshotInput.parse(undefined)).toBeDefined();
    expect(pendientesInput.parse(undefined)).toBeDefined();
    expect(kpisInput.parse(undefined)).toBeDefined();
  });

  it('morningBriefingDevInput defaults forceRegenerate false', () => {
    const parsed = morningBriefingDevInput.parse(undefined);
    expect(parsed?.forceRegenerate).toBe(false);
  });
});
