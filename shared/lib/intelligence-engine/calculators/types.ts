// Tipos transversales del framework de calculators IE (BLOQUE 8.A.2).
// ProvenanceRecord es OBLIGATORIO en cada CalculatorOutput — enforcement en
// runScore (U4 v2 upgrade). Habilita /metodologia pública FASE 21.

export interface ProvenanceSource {
  readonly name: string; // ej. 'denue', 'fgj', 'banxico_SF43783'
  readonly snapshot_date?: string; // ISO date del snapshot consumido
  readonly period?: string; // período lógico (e.g. '2026-03' para FGJ mensual)
  readonly count?: number; // # rows/observaciones consumidas
  readonly url?: string; // link oficial opcional
}

export interface ProvenanceRecord {
  readonly sources: readonly ProvenanceSource[];
  readonly computed_at: string; // ISO timestamp server time
  readonly calculator_version: string; // semver del calculator
}

// Helper — verifica que provenance es "rico" (no vacío ni trivial).
// Usado por runScore para rechazar outputs sin citation real.
export function isProvenanceValid(p: unknown): p is ProvenanceRecord {
  if (p == null || typeof p !== 'object') return false;
  const rec = p as Record<string, unknown>;
  if (!Array.isArray(rec.sources) || rec.sources.length === 0) return false;
  if (typeof rec.computed_at !== 'string' || rec.computed_at.length === 0) return false;
  if (typeof rec.calculator_version !== 'string' || rec.calculator_version.length === 0)
    return false;
  return true;
}
