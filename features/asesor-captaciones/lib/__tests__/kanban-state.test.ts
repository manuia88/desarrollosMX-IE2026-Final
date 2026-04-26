import { describe, expect, it } from 'vitest';
import { KANBAN_FSM, optimisticMove, validateTransition } from '../kanban-state';

describe('kanban-state validateTransition', () => {
  it('allows prospecto -> presentacion', () => {
    expect(validateTransition('prospecto', 'presentacion').ok).toBe(true);
  });

  it('rejects same -> same', () => {
    const r = validateTransition('prospecto', 'prospecto');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('same');
  });

  it('rejects from terminal vendido', () => {
    const r = validateTransition('vendido', 'prospecto');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('terminal');
  });

  it('rejects illegal stage skip prospecto -> en_promocion', () => {
    const r = validateTransition('prospecto', 'en_promocion');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('illegal');
  });

  it('allows pause back to prospecto from presentacion', () => {
    expect(validateTransition('presentacion', 'prospecto').ok).toBe(true);
  });

  it('FSM matrix mirrors backend canon', () => {
    expect(KANBAN_FSM.vendido).toEqual([]);
    expect(KANBAN_FSM.cerrado_no_listado).toEqual([]);
  });
});

describe('kanban-state optimisticMove', () => {
  const cards = [
    { id: 'a', status: 'prospecto' as const },
    { id: 'b', status: 'firmado' as const },
    { id: 'c', status: 'vendido' as const },
  ];

  it('moves card if transition valid', () => {
    const result = optimisticMove(cards, 'a', 'presentacion');
    expect(result.moved).toBe(true);
    expect(result.cards[0]?.status).toBe('presentacion');
    expect(result.cards).not.toBe(cards);
  });

  it('returns original cards if transition invalid', () => {
    const result = optimisticMove(cards, 'a', 'en_promocion');
    expect(result.moved).toBe(false);
    expect(result.reason).toBe('illegal');
    expect(result.cards).toBe(cards);
  });

  it('returns original cards if card not found', () => {
    const result = optimisticMove(cards, 'zzz', 'presentacion');
    expect(result.moved).toBe(false);
    expect(result.reason).toBe('not-found');
  });

  it('rejects move from terminal vendido', () => {
    const result = optimisticMove(cards, 'c', 'prospecto');
    expect(result.moved).toBe(false);
    expect(result.reason).toBe('terminal');
  });
});
