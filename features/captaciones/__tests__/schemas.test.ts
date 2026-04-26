import { describe, expect, it } from 'vitest';
import {
  captacionAdvanceStageInput,
  captacionCloseInput,
  captacionCreateInput,
  captacionListInput,
  captacionUpdateInput,
  FSM_TRANSITIONS,
  isValidTransition,
} from '../schemas';

describe('captaciones Zod schemas', () => {
  it('parses minimal create input with defaults', () => {
    const parsed = captacionCreateInput.parse({
      propietarioNombre: 'Juan Perez',
      direccion: 'Av Reforma 100, CDMX',
      tipoOperacion: 'venta',
      precioSolicitado: 5_000_000,
      countryCode: 'MX',
    });
    expect(parsed.currency).toBe('MXN');
    expect(parsed.propietarioNombre).toBe('Juan Perez');
  });

  it('rejects bad propietarioNombre length', () => {
    expect(() =>
      captacionCreateInput.parse({
        propietarioNombre: 'X',
        direccion: 'Av Reforma 100',
        tipoOperacion: 'venta',
        precioSolicitado: 100,
        countryCode: 'MX',
      }),
    ).toThrow();
  });

  it('rejects negative precio', () => {
    expect(() =>
      captacionCreateInput.parse({
        propietarioNombre: 'Juan',
        direccion: 'Av Reforma 100',
        tipoOperacion: 'venta',
        precioSolicitado: -1,
        countryCode: 'MX',
      }),
    ).toThrow();
  });

  it('list input applies defaults', () => {
    const parsed = captacionListInput.parse({});
    expect(parsed.limit).toBe(120);
  });

  it('update input requires id uuid', () => {
    expect(() => captacionUpdateInput.parse({ id: 'not-uuid', notes: 'x' })).toThrow();
    const ok = captacionUpdateInput.parse({
      id: '11111111-1111-4111-8111-111111111111',
      notes: 'hola',
    });
    expect(ok.notes).toBe('hola');
  });

  it('close input requires confirmText literal CERRAR', () => {
    expect(() =>
      captacionCloseInput.parse({
        id: '11111111-1111-4111-8111-111111111111',
        motivo: 'vendida',
        confirmText: 'cerrar',
      }),
    ).toThrow();
    const ok = captacionCloseInput.parse({
      id: '11111111-1111-4111-8111-111111111111',
      motivo: 'vendida',
      confirmText: 'CERRAR',
    });
    expect(ok.closedAsListed).toBe(true);
  });

  it('advanceStage input validates toStatus enum', () => {
    expect(() =>
      captacionAdvanceStageInput.parse({
        id: '11111111-1111-4111-8111-111111111111',
        toStatus: 'invalid',
      }),
    ).toThrow();
  });
});

describe('captaciones FSM matrix', () => {
  it('terminal states have empty transitions', () => {
    expect(FSM_TRANSITIONS.vendido).toEqual([]);
    expect(FSM_TRANSITIONS.cerrado_no_listado).toEqual([]);
  });

  it('isValidTransition allows prospecto->presentacion', () => {
    expect(isValidTransition('prospecto', 'presentacion')).toBe(true);
  });

  it('isValidTransition rejects skipping stages', () => {
    expect(isValidTransition('prospecto', 'en_promocion')).toBe(false);
    expect(isValidTransition('presentacion', 'en_promocion')).toBe(false);
  });

  it('isValidTransition rejects from terminal', () => {
    expect(isValidTransition('vendido', 'prospecto')).toBe(false);
    expect(isValidTransition('cerrado_no_listado', 'presentacion')).toBe(false);
  });

  it('isValidTransition allows pause back to prospecto', () => {
    expect(isValidTransition('presentacion', 'prospecto')).toBe(true);
  });
});
