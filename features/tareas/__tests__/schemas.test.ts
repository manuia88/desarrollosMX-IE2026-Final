import { describe, expect, it } from 'vitest';
import {
  COLUMN_MAP,
  columnForType,
  createTareaInput,
  listTareasInput,
  reassignTareaInput,
  updateTareaInput,
} from '../schemas';

describe('tareas schemas', () => {
  it('createTareaInput requires entityId for non-general types', () => {
    const result = createTareaInput.safeParse({
      type: 'property',
      title: 'Llamar a Ana',
      detalleTipo: 'contactar_propietario',
      dueAt: '2026-12-31T18:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('createTareaInput accepts general type without entityId', () => {
    const result = createTareaInput.safeParse({
      type: 'general',
      title: 'Tarea genérica',
      detalleTipo: 'custom',
      dueAt: '2026-12-31T18:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('createTareaInput accepts non-general with entityId', () => {
    const result = createTareaInput.safeParse({
      type: 'property',
      entityId: '5d2a4b6d-5e6f-4a8b-9c0d-1e2f3a4b5c6d',
      title: 'Llamar a Ana',
      detalleTipo: 'contactar_propietario',
      dueAt: '2026-12-31T18:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('createTareaInput defaults priority to media', () => {
    const result = createTareaInput.parse({
      type: 'general',
      title: 'Sin prioridad explícita',
      detalleTipo: 'custom',
      dueAt: '2026-12-31T18:00:00.000Z',
    });
    expect(result.priority).toBe('media');
  });

  it('createTareaInput rejects title too short', () => {
    const result = createTareaInput.safeParse({
      type: 'general',
      title: 'no',
      detalleTipo: 'custom',
      dueAt: '2026-12-31T18:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('updateTareaInput requires id uuid', () => {
    expect(updateTareaInput.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(updateTareaInput.safeParse({ id: '5d2a4b6d-5e6f-4a8b-9c0d-1e2f3a4b5c6d' }).success).toBe(
      true,
    );
  });

  it('listTareasInput defaults', () => {
    const out = listTareasInput.parse({});
    expect(out.scope).toBe('today');
    expect(out.teamView).toBe(false);
    expect(out.limit).toBe(120);
  });

  it('reassignTareaInput requires both uuids', () => {
    expect(
      reassignTareaInput.safeParse({
        id: '5d2a4b6d-5e6f-4a8b-9c0d-1e2f3a4b5c6d',
        newAsesorId: 'invalid',
      }).success,
    ).toBe(false);
  });

  it('columnForType maps correctly per spec COLUMN_MAP', () => {
    expect(columnForType('property')).toBe('propiedades');
    expect(columnForType('capture')).toBe('propiedades');
    expect(columnForType('search')).toBe('clientes');
    expect(columnForType('client')).toBe('clientes');
    expect(columnForType('lead')).toBe('prospectos');
    expect(columnForType('general')).toBe('general');
  });

  it('COLUMN_MAP exports propiedades/clientes/prospectos with expected types', () => {
    expect(COLUMN_MAP.propiedades).toEqual(['property', 'capture']);
    expect(COLUMN_MAP.clientes).toEqual(['search', 'client']);
    expect(COLUMN_MAP.prospectos).toEqual(['lead']);
  });
});
