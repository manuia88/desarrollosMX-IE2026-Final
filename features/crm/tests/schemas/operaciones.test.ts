import { describe, expect, it } from 'vitest';
import {
  operacionAttachCfdiInput,
  operacionCreateInput,
  operacionTypeEnum,
} from '@/features/crm/schemas/operaciones';

const u = '11111111-1111-4111-8111-111111111111';

describe('operacionTypeEnum', () => {
  it('accepts canonical types', () => {
    for (const t of ['venta', 'renta', 'preventa', 'reventa']) {
      expect(operacionTypeEnum.parse(t)).toBe(t);
    }
  });
});

describe('operacionCreateInput', () => {
  it('accepts zero commission with no currency', () => {
    const parsed = operacionCreateInput.parse({
      deal_id: u,
      operacion_type: 'venta',
      amount: 6_500_000,
      amount_currency: 'MXN',
      country_code: 'MX',
    });
    expect(parsed.commission_amount).toBe(0);
  });

  it('rejects positive commission without currency', () => {
    expect(() =>
      operacionCreateInput.parse({
        deal_id: u,
        operacion_type: 'venta',
        amount: 6_500_000,
        amount_currency: 'MXN',
        country_code: 'MX',
        commission_amount: 250_000,
      }),
    ).toThrow(/commission_currency_required/);
  });

  it('accepts positive commission with currency', () => {
    const parsed = operacionCreateInput.parse({
      deal_id: u,
      operacion_type: 'venta',
      amount: 6_500_000,
      amount_currency: 'MXN',
      country_code: 'MX',
      commission_amount: 250_000,
      commission_currency: 'MXN',
    });
    expect(parsed.commission_currency).toBe('MXN');
  });
});

describe('operacionAttachCfdiInput', () => {
  it('accepts canonical CFDI uuid', () => {
    const parsed = operacionAttachCfdiInput.parse({
      operacion_id: u,
      cfdi_uuid: 'A1B2C3D4-E5F6-1234-9ABC-DEF012345678',
    });
    expect(parsed.cfdi_uuid).toBe('A1B2C3D4-E5F6-1234-9ABC-DEF012345678');
  });

  it('rejects malformed CFDI uuid', () => {
    expect(() =>
      operacionAttachCfdiInput.parse({
        operacion_id: u,
        cfdi_uuid: 'notvalid',
      }),
    ).toThrow(/cfdi_uuid_format_invalid/);
  });
});
