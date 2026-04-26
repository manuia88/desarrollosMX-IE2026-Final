import { describe, expect, it } from 'vitest';
import {
  dealAdvanceStageInput,
  dealCloseInput,
  dealCreateInput,
} from '@/features/crm/schemas/deals';

const u = '00000000-0000-4000-8000-000000000099';

describe('dealCreateInput', () => {
  it('accepts canonical input', () => {
    const parsed = dealCreateInput.parse({
      lead_id: u,
      zone_id: u,
      stage_id: u,
      amount: 5_500_000,
      amount_currency: 'MXN',
      country_code: 'MX',
    });
    expect(parsed.probability).toBe(50);
  });

  it('rejects negative amount', () => {
    expect(() =>
      dealCreateInput.parse({
        lead_id: u,
        zone_id: u,
        stage_id: u,
        amount: -100,
        amount_currency: 'MXN',
        country_code: 'MX',
      }),
    ).toThrow();
  });

  it('rejects unsupported currency', () => {
    expect(() =>
      dealCreateInput.parse({
        lead_id: u,
        zone_id: u,
        stage_id: u,
        amount: 1_000,
        amount_currency: 'EUR',
        country_code: 'MX',
      }),
    ).toThrow();
  });

  it('rejects probability >100', () => {
    expect(() =>
      dealCreateInput.parse({
        lead_id: u,
        zone_id: u,
        stage_id: u,
        amount: 1_000,
        amount_currency: 'USD',
        country_code: 'US',
        probability: 105,
      }),
    ).toThrow();
  });
});

describe('dealAdvanceStageInput', () => {
  it('parses valid uuids', () => {
    const parsed = dealAdvanceStageInput.parse({ deal_id: u, stage_id: u });
    expect(parsed.stage_id).toBe(u);
  });
});

describe('dealCloseInput', () => {
  it('accepts won outcome', () => {
    const parsed = dealCloseInput.parse({ deal_id: u, outcome: 'won' });
    expect(parsed.outcome).toBe('won');
  });

  it('rejects unknown outcome', () => {
    expect(() => dealCloseInput.parse({ deal_id: u, outcome: 'maybe' })).toThrow();
  });
});
