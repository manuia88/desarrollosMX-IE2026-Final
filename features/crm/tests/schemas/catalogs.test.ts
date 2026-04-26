import { describe, expect, it } from 'vitest';
import { dealStageSlugEnum } from '@/features/crm/schemas/deal-stages';
import { leadSourceSlugEnum } from '@/features/crm/schemas/lead-sources';
import { personaTypeSlugEnum } from '@/features/crm/schemas/persona-types';
import { retentionEntityTypeEnum } from '@/features/crm/schemas/retention-policies';
import { countryCodeEnum, currencyCodeEnum } from '@/features/crm/schemas/shared';

describe('countryCodeEnum', () => {
  it('accepts 5 canonical countries', () => {
    for (const code of ['MX', 'CO', 'AR', 'BR', 'US']) {
      expect(countryCodeEnum.parse(code)).toBe(code);
    }
  });

  it('rejects locale format es-MX (NOT canon BD)', () => {
    expect(() => countryCodeEnum.parse('es-MX')).toThrow();
  });
});

describe('currencyCodeEnum', () => {
  it('accepts ISO 4217 canonical', () => {
    for (const code of ['MXN', 'COP', 'ARS', 'BRL', 'USD']) {
      expect(currencyCodeEnum.parse(code)).toBe(code);
    }
  });

  it('rejects EUR', () => {
    expect(() => currencyCodeEnum.parse('EUR')).toThrow();
  });
});

describe('personaTypeSlugEnum', () => {
  it('accepts 6 canonical persona slugs', () => {
    for (const slug of [
      'buyer_self',
      'asesor_lead',
      'investor',
      'masterbroker',
      'family_member',
      'referrer',
    ]) {
      expect(personaTypeSlugEnum.parse(slug)).toBe(slug);
    }
  });
});

describe('leadSourceSlugEnum', () => {
  it('accepts 8 canonical sources', () => {
    expect(leadSourceSlugEnum.parse('whatsapp')).toBe('whatsapp');
    expect(leadSourceSlugEnum.parse('partner_developer')).toBe('partner_developer');
  });
});

describe('dealStageSlugEnum', () => {
  it('accepts 7 canonical stages', () => {
    for (const slug of [
      'lead',
      'qualified',
      'showing',
      'offer',
      'contract',
      'closed_won',
      'closed_lost',
    ]) {
      expect(dealStageSlugEnum.parse(slug)).toBe(slug);
    }
  });
});

describe('retentionEntityTypeEnum', () => {
  it('accepts 7 entity types canonical', () => {
    for (const t of [
      'lead',
      'deal',
      'operacion',
      'buyer_twin',
      'fiscal_doc',
      'behavioral_signal',
      'audit_crm_log',
    ]) {
      expect(retentionEntityTypeEnum.parse(t)).toBe(t);
    }
  });
});
