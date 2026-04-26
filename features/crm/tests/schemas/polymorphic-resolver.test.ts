import { describe, expect, it } from 'vitest';
import {
  isSelfReferral,
  isValidSourceType,
  isValidTargetType,
} from '@/features/crm/lib/polymorphic-resolver';

const u1 = '55555555-5555-4555-8555-555555555551';
const u2 = '55555555-5555-4555-8555-555555555552';

describe('isValidSourceType', () => {
  it('accepts user|developer|deal', () => {
    expect(isValidSourceType('user')).toBe(true);
    expect(isValidSourceType('developer')).toBe(true);
    expect(isValidSourceType('deal')).toBe(true);
  });
  it('rejects user types not in canon', () => {
    expect(isValidSourceType('campaign')).toBe(false);
    expect(isValidSourceType('subscription')).toBe(false);
  });
});

describe('isValidTargetType', () => {
  it('accepts user|deal|operacion', () => {
    expect(isValidTargetType('user')).toBe(true);
    expect(isValidTargetType('deal')).toBe(true);
    expect(isValidTargetType('operacion')).toBe(true);
  });
  it('rejects developer (not valid target)', () => {
    expect(isValidTargetType('developer')).toBe(false);
  });
});

describe('isSelfReferral', () => {
  it('detects same type + id self-referral', () => {
    expect(
      isSelfReferral({
        source_type: 'user',
        source_id: u1,
        target_type: 'user',
        target_id: u1,
      }),
    ).toBe(true);
  });

  it('returns false when types differ', () => {
    expect(
      isSelfReferral({
        source_type: 'user',
        source_id: u1,
        target_type: 'deal',
        target_id: u1,
      }),
    ).toBe(false);
  });

  it('returns false when ids differ', () => {
    expect(
      isSelfReferral({
        source_type: 'user',
        source_id: u1,
        target_type: 'user',
        target_id: u2,
      }),
    ).toBe(false);
  });
});
