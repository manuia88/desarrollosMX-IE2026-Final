// Tipos internos del Causal Engine. Los contratos cruzados con otros features
// (Citation, CausalExplanation, IndexCode, ScopeType, CitationType, etc.)
// viven en `@/shared/types/scores` desde BATCH 3 pre-Opción D (REFACTOR-001).

import type { Citation, IndexCode, ScopeType } from '@/shared/types/scores';

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

// Raw JSON the LLM must produce. Validated by Zod before persisting.
export interface LLMOutput {
  readonly explanation_md: string;
  readonly citations: ReadonlyArray<Citation>;
}
