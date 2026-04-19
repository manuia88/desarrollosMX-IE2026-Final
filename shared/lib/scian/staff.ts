// Estimador midpoint de empleados desde rangos INEGI DENUE.
// El campo per_ocu de DENUE viene como rango ('0 a 5', '6 a 10', etc.) — para
// scoring de zona necesitamos un número. Midpoint es la heurística pragmática.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.F.1.2

const RANGE_MIDPOINTS: Array<{ pattern: RegExp; midpoint: number }> = [
  { pattern: /^0\s*a\s*5\b/i, midpoint: 3 },
  { pattern: /^6\s*a\s*10\b/i, midpoint: 8 },
  { pattern: /^11\s*a\s*30\b/i, midpoint: 20 },
  { pattern: /^31\s*a\s*50\b/i, midpoint: 40 },
  { pattern: /^51\s*a\s*100\b/i, midpoint: 75 },
  { pattern: /^101\s*a\s*250\b/i, midpoint: 175 },
  { pattern: /^251\s*y\s*más/i, midpoint: 400 },
  { pattern: /^251\+/i, midpoint: 400 },
];

export function staffMidpoint(range: string | null | undefined): number | null {
  if (!range) return null;
  const trimmed = range.trim();
  for (const r of RANGE_MIDPOINTS) {
    if (r.pattern.test(trimmed)) return r.midpoint;
  }
  const numericMatch = trimmed.match(/^(\d+)$/);
  if (numericMatch?.[1]) {
    const n = Number.parseInt(numericMatch[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
