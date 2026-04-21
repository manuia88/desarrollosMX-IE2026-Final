// Shared contracts for the Causal Engine feature.
// Used by backend (engine, tRPC), UI (components, hooks), and observability.

import type { INDEX_CODES } from '@/features/indices-publicos/lib/index-registry-helpers';

export type ScopeType = 'colonia' | 'alcaldia' | 'city' | 'estado';

export type IndexCode = (typeof INDEX_CODES)[number];

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

// Input data pulled from Postgres for the LLM prompt.
// Passed as structured JSON so the model cannot hallucinate numbers.
export interface CausalInput {
  readonly score_id: string;
  readonly index_code: IndexCode;
  readonly scope_type: ScopeType;
  readonly scope_id: string;
  readonly scope_label: string;
  readonly period_date: string;
  readonly current_value: number;
  readonly previous_value: number | null;
  readonly trend_direction: 'mejorando' | 'estable' | 'empeorando' | null;
  readonly trend_delta: number | null;
  readonly score_band: string | null;
  readonly confidence: string;
  readonly subscores: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly value: number | null;
    readonly weight: number | null;
  }>;
  readonly allowed_citations: ReadonlyArray<Citation>;
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

// Raw JSON the LLM must produce. Validated by Zod before persisting.
export interface LLMOutput {
  readonly explanation_md: string;
  readonly citations: ReadonlyArray<Citation>;
}
