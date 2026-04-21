// Matches [[type:ref_id]] where type is one of the known citation kinds and
// ref_id can contain letters, digits, dashes, underscores, colons, dots.
const CITATION_REGEX = /\[\[(?:score|macro|geo|news):([A-Za-z0-9_\-:.]+)\]\]/g;

export function parseCitations(md: string): string[] {
  if (!md) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of md.matchAll(CITATION_REGEX)) {
    const suffix = match[1];
    if (!suffix) continue;
    const full = match[0].slice(2, -2);
    if (!seen.has(full)) {
      seen.add(full);
      out.push(full);
    }
  }
  return out;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly missing: string[];
}

export function validateCitations(extracted: string[], allowedRefs: string[]): ValidationResult {
  const allowed = new Set(allowedRefs);
  const missing = extracted.filter((ref) => !allowed.has(ref));
  return { valid: missing.length === 0, missing };
}
