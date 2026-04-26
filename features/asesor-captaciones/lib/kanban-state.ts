import type { CaptacionStatusKey } from './filter-schemas';

/**
 * FSM whitelist transitions matrix for kanban drag-drop client-side validation.
 * Mirrors features/captaciones/schemas FSM_TRANSITIONS — keep in sync when canon changes.
 */
export const KANBAN_FSM: Readonly<Record<CaptacionStatusKey, readonly CaptacionStatusKey[]>> = {
  prospecto: ['presentacion', 'cerrado_no_listado', 'vendido'],
  presentacion: ['firmado', 'prospecto', 'cerrado_no_listado', 'vendido'],
  firmado: ['en_promocion', 'cerrado_no_listado', 'vendido'],
  en_promocion: ['vendido', 'cerrado_no_listado'],
  vendido: [],
  cerrado_no_listado: [],
} as const;

export interface ValidateTransitionResult {
  ok: boolean;
  reason?: 'illegal' | 'terminal' | 'same';
}

export function validateTransition(
  from: CaptacionStatusKey,
  to: CaptacionStatusKey,
): ValidateTransitionResult {
  if (from === to) return { ok: false, reason: 'same' };
  if (KANBAN_FSM[from].length === 0) return { ok: false, reason: 'terminal' };
  if (!KANBAN_FSM[from].includes(to)) return { ok: false, reason: 'illegal' };
  return { ok: true };
}

export interface KanbanCard {
  id: string;
  status: CaptacionStatusKey;
}

/**
 * Pure reducer: optimistic move of a card to target status.
 * Returns new array with card moved (status updated) if transition valid, else returns original.
 */
export function optimisticMove<T extends KanbanCard>(
  cards: T[],
  cardId: string,
  toStatus: CaptacionStatusKey,
): { cards: T[]; moved: boolean; reason?: 'illegal' | 'terminal' | 'same' | 'not-found' } {
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return { cards, moved: false, reason: 'not-found' };
  const target = cards[idx];
  if (!target) return { cards, moved: false, reason: 'not-found' };
  const validation = validateTransition(target.status, toStatus);
  if (!validation.ok) {
    return {
      cards,
      moved: false,
      ...(validation.reason ? { reason: validation.reason } : {}),
    };
  }
  const next = cards.slice();
  next[idx] = { ...target, status: toStatus };
  return { cards: next, moved: true };
}
