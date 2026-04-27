import { describe, expect, it } from 'vitest';
import { emptyGrouped, rowToCardData, statusOrderRank } from '../types';

describe('tareas types helpers', () => {
  it('statusOrderRank: expired < pending < done', () => {
    expect(statusOrderRank('expired')).toBe(0);
    expect(statusOrderRank('pending')).toBe(1);
    expect(statusOrderRank('done')).toBe(2);
  });

  it('emptyGrouped builds 4 empty arrays', () => {
    const g = emptyGrouped();
    expect(g.propiedades).toEqual([]);
    expect(g.clientes).toEqual([]);
    expect(g.prospectos).toEqual([]);
    expect(g.general).toEqual([]);
  });

  it('rowToCardData maps snake_case → camelCase', () => {
    const card = rowToCardData({
      id: '00000000-0000-0000-0000-000000000001',
      asesor_id: '00000000-0000-0000-0000-00000000aaaa',
      type: 'property',
      entity_id: '00000000-0000-0000-0000-00000000bbbb',
      title: 'Llamar a Ana',
      detalle_tipo: 'contactar_propietario',
      description: null,
      due_at: '2026-12-31T18:00:00.000Z',
      priority: 'alta',
      status: 'pending',
      redirect_to: null,
      completed_at: null,
      calendar_event_id: null,
      created_at: '2026-04-26T00:00:00.000Z',
      updated_at: '2026-04-26T00:00:00.000Z',
    });
    expect(card.asesorId).toBe('00000000-0000-0000-0000-00000000aaaa');
    expect(card.detalleTipo).toBe('contactar_propietario');
    expect(card.dueAt).toBe('2026-12-31T18:00:00.000Z');
    expect(card.priority).toBe('alta');
  });
});
