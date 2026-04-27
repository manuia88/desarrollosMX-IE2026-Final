// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Priority scoring puro para waitlist Studio. Sin I/O — input cualquier rol +
// counters opcionales. Cap 100, multiplier 1.5 para usuarios DMX existentes.

import type { z } from 'zod';
import type { studioWaitlistRoleEnum } from '@/features/dmx-studio/schemas';

export type StudioWaitlistRole = z.infer<typeof studioWaitlistRoleEnum>;

export const PRIORITY_SCORE_CAP = 100 as const;
export const EXISTING_USER_MULTIPLIER = 1.5 as const;

const ROLE_BASE_SCORE: Record<StudioWaitlistRole, number> = {
  asesor: 5,
  admin_desarrolladora: 8,
  broker: 7,
  photographer: 4,
  investor: 3,
  other: 1,
};

export interface CalculatePriorityScoreInput {
  readonly role: StudioWaitlistRole;
  readonly currentLeadsCount?: number | null;
  readonly currentClosedDealsCount?: number | null;
  readonly isExistingUser: boolean;
}

export function calculatePriorityScore(input: CalculatePriorityScoreInput): number {
  const { role, currentLeadsCount, currentClosedDealsCount, isExistingUser } = input;

  let raw: number;

  if (role === 'asesor' && isExistingUser) {
    const leads = Math.max(0, currentLeadsCount ?? 0);
    const closed = Math.max(0, currentClosedDealsCount ?? 0);
    raw = leads * 0.5 + closed * 2 + 10;
  } else {
    raw = ROLE_BASE_SCORE[role];
  }

  if (isExistingUser) {
    raw = raw * EXISTING_USER_MULTIPLIER;
  }

  const capped = Math.min(raw, PRIORITY_SCORE_CAP);
  return Math.max(0, Math.round(capped));
}
