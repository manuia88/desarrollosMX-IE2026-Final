// D13 FASE 10 — confidence propagation upstream-aware para scores compuestos.
//
// Problema que resuelve:
//   composeConfidence (ver calculators/confidence.ts) elige el peor entre una
//   lista. Pero en scores compuestos N2/N3/N4 hay dependencias CRÍTICAS cuyo
//   confidence debe forzar el tope del score compuesto (no solo el peor).
//
// Ej: F09 Value Score depende de F08 + A12 + N11. A12 es crítica (sin comparables
//   válidos el price fairness no existe). Si A12.confidence = low, F09.confidence
//   NO puede ser high aunque F08 y N11 sean high.
//
// Regla core:
//   - critical deps low     → score no puede ser > medium
//   - critical deps medium  → score no puede ser > medium
//   - critical deps insuf   → score = insufficient_data (propagate fail)
//   - non-critical deps     → compose worst (comportamiento original)
//
// API:
//   propagateConfidence({ critical: [...], supporting: [...], coverage_pct? })
//     → { confidence, cap_reason, capped_by }
//
// Habilita trust factor B2B: aseguradoras/bancos rechazan scores "high" que
// dependen de un calculator "low-confidence" sin declararlo.

import type { Confidence } from './calculators/base';

export interface DepConfidence {
  readonly scoreId: string;
  readonly confidence: Confidence;
  readonly role?: string;
}

export interface PropagationInput {
  readonly critical: readonly DepConfidence[];
  readonly supporting?: readonly DepConfidence[];
  readonly coverage_pct?: number;
  readonly min_coverage_pct?: number;
  readonly high_coverage_pct?: number;
}

export interface PropagationResult {
  readonly confidence: Confidence;
  readonly cap_reason: string | null;
  readonly capped_by: readonly string[];
}

const ORDER: Record<Confidence, number> = {
  insufficient_data: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function worst(list: readonly Confidence[]): Confidence {
  if (list.length === 0) return 'insufficient_data';
  let w: Confidence = 'high';
  for (const c of list) {
    if (ORDER[c] < ORDER[w]) w = c;
  }
  return w;
}

function cap(current: Confidence, ceiling: Confidence): Confidence {
  return ORDER[current] > ORDER[ceiling] ? ceiling : current;
}

export function propagateConfidence(input: PropagationInput): PropagationResult {
  const critical = input.critical;
  const supporting = input.supporting ?? [];

  // Regla 1 — critical deps insufficient_data → fail propagation.
  const insufCritical = critical.filter((d) => d.confidence === 'insufficient_data');
  if (insufCritical.length > 0) {
    return {
      confidence: 'insufficient_data',
      cap_reason: 'critical_dependency_insufficient',
      capped_by: insufCritical.map((d) => d.scoreId),
    };
  }

  // Regla 2 — critical deps worst establece techo.
  const criticalConfs = critical.map((d) => d.confidence);
  const supportingConfs = supporting.map((d) => d.confidence);
  const allConfs = [...criticalConfs, ...supportingConfs];

  let composed: Confidence = allConfs.length > 0 ? worst(allConfs) : 'insufficient_data';
  const capped_by: string[] = [];
  let cap_reason: string | null = null;

  if (criticalConfs.length > 0) {
    const criticalWorst = worst(criticalConfs);
    const before = composed;
    composed = cap(composed, criticalWorst);
    if (ORDER[composed] < ORDER[before] || composed === criticalWorst) {
      const limitingCritical = critical.filter((d) => d.confidence === criticalWorst);
      if (limitingCritical.length > 0 && ORDER[criticalWorst] < 3) {
        for (const d of limitingCritical) capped_by.push(d.scoreId);
        cap_reason = `critical_worst:${criticalWorst}`;
      }
    }
  }

  // Regla 3 — coverage_pct bajo el umbral alto baja a medium (alineado F08).
  if (
    typeof input.coverage_pct === 'number' &&
    typeof input.high_coverage_pct === 'number' &&
    input.coverage_pct < input.high_coverage_pct &&
    composed === 'high'
  ) {
    composed = 'medium';
    cap_reason = cap_reason ?? 'coverage_below_high_threshold';
  }

  // Regla 4 — coverage_pct bajo min → insufficient_data (fail coverage).
  if (
    typeof input.coverage_pct === 'number' &&
    typeof input.min_coverage_pct === 'number' &&
    input.coverage_pct < input.min_coverage_pct
  ) {
    return {
      confidence: 'insufficient_data',
      cap_reason: 'coverage_below_min_threshold',
      capped_by: [],
    };
  }

  return {
    confidence: composed,
    cap_reason,
    capped_by,
  };
}

// Helper: filtra deps válidas (value numérico) — usable por calculators N2/N3/N4
// antes de llamar propagateConfidence.
export function collectDepConfidences<T extends { scoreId: string; confidence: Confidence }>(
  rawDeps: readonly T[],
  criticalScoreIds: readonly string[],
): { critical: DepConfidence[]; supporting: DepConfidence[] } {
  const criticalSet = new Set(criticalScoreIds);
  const critical: DepConfidence[] = [];
  const supporting: DepConfidence[] = [];
  for (const d of rawDeps) {
    const entry: DepConfidence = { scoreId: d.scoreId, confidence: d.confidence };
    if (criticalSet.has(d.scoreId)) critical.push(entry);
    else supporting.push(entry);
  }
  return { critical, supporting };
}
