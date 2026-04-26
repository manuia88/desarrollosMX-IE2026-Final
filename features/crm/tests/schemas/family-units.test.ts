import { describe, expect, it } from 'vitest';
import {
  familyUnitAddMemberInput,
  familyUnitCreateInput,
  familyUnitTypeEnum,
  relationshipEnum,
} from '@/features/crm/schemas/family-units';

const u = '44444444-4444-4444-8444-444444444444';

describe('familyUnitTypeEnum', () => {
  it('accepts 4 canonical types', () => {
    for (const t of ['couple', 'family', 'partnership', 'single']) {
      expect(familyUnitTypeEnum.parse(t)).toBe(t);
    }
  });
});

describe('relationshipEnum', () => {
  it('accepts 6 canonical relationships', () => {
    for (const r of ['spouse', 'child', 'parent', 'sibling', 'partner', 'other']) {
      expect(relationshipEnum.parse(r)).toBe(r);
    }
  });
});

describe('familyUnitCreateInput', () => {
  it('defaults members_count=1', () => {
    const parsed = familyUnitCreateInput.parse({
      primary_buyer_twin_id: u,
      unit_type: 'single',
      country_code: 'MX',
    });
    expect(parsed.members_count).toBe(1);
  });

  it('rejects members_count=0', () => {
    expect(() =>
      familyUnitCreateInput.parse({
        primary_buyer_twin_id: u,
        unit_type: 'family',
        members_count: 0,
        country_code: 'MX',
      }),
    ).toThrow();
  });
});

describe('familyUnitAddMemberInput', () => {
  it('accepts canonical input', () => {
    const parsed = familyUnitAddMemberInput.parse({
      family_unit_id: u,
      buyer_twin_id: u,
      relationship: 'spouse',
    });
    expect(parsed.is_primary).toBe(false);
  });
});
