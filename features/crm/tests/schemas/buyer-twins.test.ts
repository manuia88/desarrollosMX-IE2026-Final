import { describe, expect, it } from 'vitest';
import {
  buyerTwinComputeTraitsInput,
  buyerTwinCreateInput,
  buyerTwinTraitSchema,
} from '@/features/crm/schemas/buyer-twins';

const u = '22222222-2222-4222-8222-222222222222';

describe('buyerTwinCreateInput', () => {
  it('accepts canonical input', () => {
    const parsed = buyerTwinCreateInput.parse({
      persona_type_id: u,
      country_code: 'MX',
    });
    expect(parsed.zone_focus_ids).toEqual([]);
  });

  it('rejects unsupported country', () => {
    expect(() =>
      buyerTwinCreateInput.parse({
        persona_type_id: u,
        country_code: 'PE',
      }),
    ).toThrow();
  });
});

describe('buyerTwinTraitSchema', () => {
  it('accepts valid DISC trait', () => {
    const parsed = buyerTwinTraitSchema.parse({
      id: u,
      buyer_twin_id: u,
      trait_system: 'disc',
      trait_code: 'D',
      trait_value: 75,
      confidence: 0.8,
      computed_at: new Date().toISOString(),
    });
    expect(parsed.trait_code).toBe('D');
  });

  it('rejects DISC code O', () => {
    expect(() =>
      buyerTwinTraitSchema.parse({
        id: u,
        buyer_twin_id: u,
        trait_system: 'disc',
        trait_code: 'O',
        trait_value: 50,
        confidence: 0.5,
        computed_at: new Date().toISOString(),
      }),
    ).toThrow(/trait_code_invalid_for_system/);
  });

  it('accepts valid Big Five trait', () => {
    const parsed = buyerTwinTraitSchema.parse({
      id: u,
      buyer_twin_id: u,
      trait_system: 'big_five',
      trait_code: 'O',
      trait_value: 65,
      confidence: 0.7,
      computed_at: new Date().toISOString(),
    });
    expect(parsed.trait_value).toBe(65);
  });
});

describe('buyerTwinComputeTraitsInput', () => {
  it('accepts disc_profile only', () => {
    const parsed = buyerTwinComputeTraitsInput.parse({
      buyer_twin_id: u,
      disc_profile: { D: 80, I: 60, S: 30, C: 50 },
    });
    expect(parsed.disc_profile).toBeDefined();
  });
});
