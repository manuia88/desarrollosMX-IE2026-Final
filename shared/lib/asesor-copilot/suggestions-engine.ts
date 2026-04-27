// FASE 13.F PR-C M03 — Copilot Suggestions Engine (deterministic H1)
// Pure function — no LLM cost. Future LLM upgrade FASE 16+ se inserta como capa
// adicional (este engine queda como fallback offline-safe + low-cost path).

export type DiscLetter = 'D' | 'I' | 'S' | 'C';

export type LeadStatusForSuggest = 'new' | 'qualified' | 'nurturing' | 'converted' | 'lost';

export interface SuggestionsInput {
  leadStatus: LeadStatusForSuggest;
  buyerTwinDisc?: DiscLetter | null;
  lastContactDays: number;
  familySize?: number | null;
}

export type SuggestionPriority = 'high' | 'med' | 'low';

export interface Suggestion {
  priority: SuggestionPriority;
  actionKey: string;
  reasonKey: string;
}

const PRIORITY_RANK: Record<SuggestionPriority, number> = {
  high: 0,
  med: 1,
  low: 2,
};

function pushUnique(out: Suggestion[], candidate: Suggestion, seenKeys: Set<string>): void {
  if (seenKeys.has(candidate.actionKey)) return;
  seenKeys.add(candidate.actionKey);
  out.push(candidate);
}

/**
 * Deterministic suggestions for a lead based on signals available.
 * Returns top-3 suggestions ordered by priority (high → low).
 *
 * Logic (template-based, ADR-018 deterministic — NO LLM H1):
 * - lastContactDays > 14 → high "Re-engagement"
 * - DISC D → med "Mensaje directo, propuesta concreta"
 * - DISC I → med "Llamada con calor humano"
 * - DISC S → med "Reasegurarle, no presionar"
 * - DISC C → med "Enviar data + comparables + métricas"
 * - familySize > 3 → med "Mostrar amenities familiares"
 * - leadStatus === 'qualified' → high "Agendar visita prioritaria"
 * - default → low "Enviar listing personalizado"
 */
export function buildSuggestions(input: SuggestionsInput): Suggestion[] {
  const out: Suggestion[] = [];
  const seenKeys = new Set<string>();

  if (input.lastContactDays > 14) {
    pushUnique(
      out,
      {
        priority: 'high',
        actionKey: 'reEngagementTemplate',
        reasonKey: 'reasonInactiveLead',
      },
      seenKeys,
    );
  }

  if (input.leadStatus === 'qualified') {
    pushUnique(
      out,
      {
        priority: 'high',
        actionKey: 'scheduleVisitPriority',
        reasonKey: 'reasonQualifiedLead',
      },
      seenKeys,
    );
  }

  switch (input.buyerTwinDisc) {
    case 'D':
      pushUnique(
        out,
        {
          priority: 'med',
          actionKey: 'discDDirectMessage',
          reasonKey: 'reasonDiscD',
        },
        seenKeys,
      );
      break;
    case 'I':
      pushUnique(
        out,
        {
          priority: 'med',
          actionKey: 'discICall',
          reasonKey: 'reasonDiscI',
        },
        seenKeys,
      );
      break;
    case 'S':
      pushUnique(
        out,
        {
          priority: 'med',
          actionKey: 'discSReassure',
          reasonKey: 'reasonDiscS',
        },
        seenKeys,
      );
      break;
    case 'C':
      pushUnique(
        out,
        {
          priority: 'med',
          actionKey: 'discCData',
          reasonKey: 'reasonDiscC',
        },
        seenKeys,
      );
      break;
    default:
      // No DISC profile yet — skip DISC-tailored suggestion.
      break;
  }

  if (typeof input.familySize === 'number' && input.familySize > 3) {
    pushUnique(
      out,
      {
        priority: 'med',
        actionKey: 'familyAmenitiesAndSchools',
        reasonKey: 'reasonLargeFamily',
      },
      seenKeys,
    );
  }

  // Always-on default fallback so we never return empty list.
  pushUnique(
    out,
    {
      priority: 'low',
      actionKey: 'sendPersonalizedListing',
      reasonKey: 'reasonDefaultFollowUp',
    },
    seenKeys,
  );

  out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return out.slice(0, 3);
}
