// CF.4 Worksheet priority sort v1 — urgency-based (FASE 15.C ola 3).
// V2 Forward: combinar dev_trust_scores.score_overall + lead_scores cuando worksheet→lead
// linkage exista (FASE 15.D.1.5 post B.6 lead score C01 ship — referencia ADR-060 D.10).
//
// Spec v1: priority_score = clamp(100 - hoursRemaining * 2, 0, 100).
// Worksheets más urgentes (menos horas hasta expiración) reciben score más alto.
// Worksheet expirable en 0h → 100. En 48h → 4.

const MAX_PRIORITY = 100;
const MIN_PRIORITY = 0;
const HOUR_DECAY = 2;

export function computeWorksheetPriority(expiresAtIso: string, nowIso?: string): number {
  const now = new Date(nowIso ?? new Date().toISOString()).getTime();
  const expires = new Date(expiresAtIso).getTime();
  const hoursRemaining = Math.max(0, (expires - now) / (1000 * 60 * 60));
  const raw = MAX_PRIORITY - hoursRemaining * HOUR_DECAY;
  return Math.max(MIN_PRIORITY, Math.min(MAX_PRIORITY, Math.round(raw)));
}
