import { describe, expect, it } from 'vitest';
import {
  referralAttributeInput,
  referralRewardPayInput,
  referralSchema,
} from '@/features/crm/schemas/referrals';

const u1 = '33333333-3333-4333-8333-333333333331';
const u2 = '33333333-3333-4333-8333-333333333332';

describe('referralAttributeInput', () => {
  it('accepts user→deal attribution', () => {
    const parsed = referralAttributeInput.parse({
      source_type: 'user',
      source_id: u1,
      target_type: 'deal',
      target_id: u2,
      country_code: 'MX',
    });
    expect(parsed.source_type).toBe('user');
  });

  it('rejects unsupported source_type', () => {
    expect(() =>
      referralAttributeInput.parse({
        source_type: 'campaign',
        source_id: u1,
        target_type: 'deal',
        target_id: u2,
        country_code: 'MX',
      }),
    ).toThrow();
  });
});

describe('referralSchema', () => {
  const baseRow = {
    id: u1,
    source_type: 'user' as const,
    source_id: u1,
    target_type: 'deal' as const,
    target_id: u2,
    persona_type_id: null,
    status: 'pending' as const,
    attribution_chain: [],
    reward_amount: null,
    reward_currency: null,
    country_code: 'MX' as const,
    expires_at: null,
    attributed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('accepts valid referral', () => {
    expect(() => referralSchema.parse(baseRow)).not.toThrow();
  });

  it('rejects self-referral (same type + id)', () => {
    expect(() =>
      referralSchema.parse({
        ...baseRow,
        source_type: 'user',
        source_id: u1,
        target_type: 'user',
        target_id: u1,
      }),
    ).toThrow(/self_referral_blocked/);
  });
});

describe('referralRewardPayInput', () => {
  it('accepts valid input', () => {
    const parsed = referralRewardPayInput.parse({
      reward_id: u1,
      payment_method: 'transfer',
      payment_reference: 'TX-12345',
    });
    expect(parsed.payment_method).toBe('transfer');
  });

  it('rejects empty payment_method', () => {
    expect(() =>
      referralRewardPayInput.parse({
        reward_id: u1,
        payment_method: '',
        payment_reference: 'X',
      }),
    ).toThrow();
  });
});
