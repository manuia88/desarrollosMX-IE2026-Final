// Contratos compartidos entre features de scoring/explicabilidad.
// Extraídos en BATCH 3 pre-Opción D (REFACTOR-001) para romper el ciclo
// causal-engine ⟷ indices-publicos y permitir que newsletter, widget-embed,
// preview-ux consuman estos tipos sin imports cross-feature.

export const INDEX_CODES = [
  'IPV',
  'IAB',
  'IDS',
  'IRE',
  'ICO',
  'MOM',
  'LIV',
  'FAM',
  'YNG',
  'GRN',
  'STR',
  'INV',
  'DEV',
  'GNT',
  'STA',
] as const;

export type IndexCode = (typeof INDEX_CODES)[number];

export const SCOPE_TYPES = ['colonia', 'alcaldia', 'city', 'estado'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

// Citation types shown in the CitationsList UI with distinct visual tones.
export const CITATION_TYPES = ['score', 'macro', 'geo', 'news'] as const;
export type CitationType = (typeof CITATION_TYPES)[number];

// Canonical reference shape. `ref_id` is the stable string id used inside the
// markdown (e.g. `[[score:IPV-roma-norte-2026-03]]`). `href` optional deep link.
export interface Citation {
  readonly ref_id: string;
  readonly type: CitationType;
  readonly label: string;
  readonly value: string | number | null;
  readonly source: string;
  readonly href?: string | null;
  readonly as_of?: string | null;
}

// Output persisted in causal_explanations + returned from tRPC.
export interface CausalExplanation {
  readonly explanation_md: string;
  readonly citations: ReadonlyArray<Citation>;
  readonly model: string;
  readonly prompt_version: string;
  readonly generated_at: string;
  readonly cached: boolean;
  readonly tokens_used?: number;
  readonly cost_usd?: number;
}
