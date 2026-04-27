import { describe, expect, it } from 'vitest';
import {
  cancelOperacionInput,
  createOperacionInput,
  isStatusTransitionValid,
  listOperacionesInput,
  registerPagoInput,
  STATUS_COMPLETION_PCT,
  STATUS_TRANSITIONS,
  updateOperacionStatusInput,
} from '../schemas';

const baseValidInput = {
  countryCode: 'MX' as const,
  side: 'ambos' as const,
  comprador: {
    asesorId: '11111111-1111-4111-8111-111111111111',
    contactoId: '22222222-2222-4222-8222-222222222222',
  },
  vendedor: {
    propiedadType: 'unidad' as const,
    propiedadId: '33333333-3333-4333-8333-333333333333',
    asesorVendedorId: '44444444-4444-4444-8444-444444444444',
    propietarioContactoId: '55555555-5555-4555-8555-555555555555',
  },
  estado: {
    status: 'propuesta' as const,
    fechaCierre: '2026-06-15',
    cierreAmount: 3_500_000,
    cierreCurrency: 'MXN' as const,
  },
  comision: {
    comisionPct: 4,
    ivaPct: 16,
    splitDmxPct: 20,
    declaracionJurada: true as const,
  },
  notas: { attachmentIds: [] },
};

describe('operaciones schemas', () => {
  it('createOperacionInput accepts valid wizard payload', () => {
    const result = createOperacionInput.safeParse(baseValidInput);
    expect(result.success).toBe(true);
  });

  it('createOperacionInput rejects declaracionJurada=false', () => {
    const result = createOperacionInput.safeParse({
      ...baseValidInput,
      comision: { ...baseValidInput.comision, declaracionJurada: false },
    });
    expect(result.success).toBe(false);
  });

  it('createOperacionInput rejects cierreAmount <= 0', () => {
    const result = createOperacionInput.safeParse({
      ...baseValidInput,
      estado: { ...baseValidInput.estado, cierreAmount: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('createOperacionInput rejects reservaAmount > 0 sin reservaCurrency', () => {
    const result = createOperacionInput.safeParse({
      ...baseValidInput,
      estado: { ...baseValidInput.estado, reservaAmount: 100_000 },
    });
    expect(result.success).toBe(false);
  });

  it('cancelOperacionInput requires motivo ≥ 10 chars', () => {
    const tooShort = cancelOperacionInput.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      motivo: 'no',
    });
    expect(tooShort.success).toBe(false);
    const valid = cancelOperacionInput.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      motivo: 'comprador no continuó negociación',
    });
    expect(valid.success).toBe(true);
  });

  it('updateOperacionStatusInput cancelada requires motivo', () => {
    const noMotivo = updateOperacionStatusInput.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      newStatus: 'cancelada',
    });
    expect(noMotivo.success).toBe(false);
    const withMotivo = updateOperacionStatusInput.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      newStatus: 'cancelada',
      motivo: 'comprador desistió tras avalúo',
    });
    expect(withMotivo.success).toBe(true);
  });

  it('listOperacionesInput defaults limit to 50', () => {
    const result = listOperacionesInput.parse({});
    expect(result.limit).toBe(50);
  });

  it('registerPagoInput rejects negative amount', () => {
    const result = registerPagoInput.safeParse({
      operacionId: '11111111-1111-4111-8111-111111111111',
      amount: -10,
      currency: 'MXN',
      fechaPago: '2026-06-15',
    });
    expect(result.success).toBe(false);
  });
});

describe('operaciones FSM transitions', () => {
  it('propuesta → oferta_aceptada is valid', () => {
    expect(isStatusTransitionValid('propuesta', 'oferta_aceptada')).toBe(true);
  });
  it('propuesta → cerrada is invalid (skip steps)', () => {
    expect(isStatusTransitionValid('propuesta', 'cerrada')).toBe(false);
  });
  it('cancelada is terminal', () => {
    expect(STATUS_TRANSITIONS.cancelada).toEqual([]);
  });
  it('any → cancelada is valid', () => {
    expect(isStatusTransitionValid('propuesta', 'cancelada')).toBe(true);
    expect(isStatusTransitionValid('escritura', 'cancelada')).toBe(true);
    expect(isStatusTransitionValid('cerrada', 'cancelada')).toBe(true);
  });
  it('completion_pct cancelada=0', () => {
    expect(STATUS_COMPLETION_PCT.cancelada).toBe(0);
  });
  it('completion_pct cerrada=85 pagando=95', () => {
    expect(STATUS_COMPLETION_PCT.cerrada).toBe(85);
    expect(STATUS_COMPLETION_PCT.pagando).toBe(95);
  });
});
