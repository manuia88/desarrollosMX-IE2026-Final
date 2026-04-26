import { describe, expect, it } from 'vitest';
import {
  leadAssignInput,
  leadCreateInput,
  leadListInput,
  leadStatusEnum,
  leadUpdateStatusInput,
} from '@/features/crm/schemas/leads';

const validUuid = '00000000-0000-4000-8000-000000000001';

describe('leadStatusEnum', () => {
  it('accepts canonical statuses', () => {
    for (const status of ['new', 'qualified', 'nurturing', 'converted', 'lost']) {
      expect(leadStatusEnum.parse(status)).toBe(status);
    }
  });

  it('rejects unknown status', () => {
    expect(() => leadStatusEnum.parse('archived')).toThrow();
  });
});

describe('leadCreateInput', () => {
  it('accepts when contact_email present', () => {
    const parsed = leadCreateInput.parse({
      zone_id: validUuid,
      source_id: validUuid,
      country_code: 'MX',
      contact_name: 'Juan Pérez',
      contact_email: 'juan@example.com',
    });
    expect(parsed.contact_name).toBe('Juan Pérez');
  });

  it('accepts when only contact_phone present', () => {
    const parsed = leadCreateInput.parse({
      zone_id: validUuid,
      source_id: validUuid,
      country_code: 'CO',
      contact_name: 'Ana García',
      contact_phone: '+5731112345',
    });
    expect(parsed.contact_phone).toBe('+5731112345');
  });

  it('rejects when neither email nor phone provided', () => {
    expect(() =>
      leadCreateInput.parse({
        zone_id: validUuid,
        source_id: validUuid,
        country_code: 'MX',
        contact_name: 'Sin contacto',
      }),
    ).toThrow(/contact_email_or_phone_required/);
  });

  it('rejects unsupported country_code', () => {
    expect(() =>
      leadCreateInput.parse({
        zone_id: validUuid,
        source_id: validUuid,
        country_code: 'PE',
        contact_name: 'Test',
        contact_email: 'a@b.com',
      }),
    ).toThrow();
  });

  it('rejects empty contact_name after trim', () => {
    expect(() =>
      leadCreateInput.parse({
        zone_id: validUuid,
        source_id: validUuid,
        country_code: 'MX',
        contact_name: '   ',
        contact_email: 'a@b.com',
      }),
    ).toThrow();
  });
});

describe('leadUpdateStatusInput', () => {
  it('parses valid status', () => {
    const parsed = leadUpdateStatusInput.parse({
      lead_id: validUuid,
      status: 'qualified',
    });
    expect(parsed.status).toBe('qualified');
  });

  it('rejects invalid uuid', () => {
    expect(() => leadUpdateStatusInput.parse({ lead_id: 'abc', status: 'new' })).toThrow();
  });
});

describe('leadAssignInput', () => {
  it('parses valid uuids', () => {
    const parsed = leadAssignInput.parse({
      lead_id: validUuid,
      assigned_asesor_id: validUuid,
    });
    expect(parsed.lead_id).toBe(validUuid);
  });
});

describe('leadListInput', () => {
  it('applies defaults', () => {
    const parsed = leadListInput.parse({});
    expect(parsed.limit).toBe(50);
  });

  it('rejects oversize limit', () => {
    expect(() => leadListInput.parse({ limit: 500 })).toThrow();
  });
});
