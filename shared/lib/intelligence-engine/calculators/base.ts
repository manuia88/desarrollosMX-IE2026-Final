// Framework de calculators IE — contrato uniforme para los 118 scores
// implementados en BLOQUEs 8.B/8.C (N0) y fases siguientes.
// Referencia: docs/02_PLAN_MAESTRO/FASE_08_IE_SCORES_N0.md §8.A.2.1 +
// ADR-010 §D4.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProvenanceRecord } from './types';

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface CalculatorInput {
  readonly zoneId?: string;
  readonly projectId?: string;
  readonly userId?: string;
  readonly countryCode: string;
  readonly periodDate: string; // ISO YYYY-MM-DD
  // Parámetros opcionales on-demand (ej. destino para H09 Commute).
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface CalculatorCitation {
  readonly source: string;
  readonly url?: string;
  readonly period?: string;
  readonly count?: number;
}

export interface CalculatorOutput<TComponents extends object = Record<string, unknown>> {
  readonly score_value: number; // 0-100 canónico
  readonly score_label: string; // i18n key — ej. 'ie.score.f01.muy_seguro' (U14)
  readonly components: TComponents;
  readonly inputs_used: Readonly<Record<string, unknown>>;
  readonly confidence: Confidence;
  readonly citations: readonly CalculatorCitation[];
  readonly trend_vs_previous?: number;
  readonly trend_direction?: 'mejorando' | 'estable' | 'empeorando';
  // REQUIRED U4 — cada calculator declara sus fuentes en formato estándar.
  // Sin provenance, runScore rechaza el output.
  readonly provenance: ProvenanceRecord;
  // OPCIONAL U12 — vars para resolver reasoning_template del calculator sin
  // alucinación (Copilot ⌘J FASE 12). Shape libre string|number.
  readonly template_vars?: Readonly<Record<string, string | number>>;
  // OPCIONAL P1 — valid_until timestamp explícito. Si se omite, persist.ts lo
  // deriva de methodology.validity (ver ValidityWindow) sumando al computed_at.
  readonly valid_until?: string;
  // OPCIONAL D19 FASE 10 — explanations LIME-style para ML scores (H14, E03).
  // Persiste en zone_scores.ml_explanations / project_scores.ml_explanations.
  readonly ml_explanations?: Readonly<Record<string, unknown>>;
  // OPCIONAL D25 FASE 10 — stability 0-1 derivado de score_history rolling 12m.
  // Si el calculator no lo provee, persist.ts lo calcula y escribe directamente.
  readonly stability_index?: number;
  // OPCIONAL D29 FASE 10 SESIÓN 2/3 — multi-scenario output.
  // Calculators como A07/A09/A11 devuelven variantes (optimistic/base/pessimistic
  // o buy_now/wait_3m/6m/12m). UI (portal comprador) renderiza rangos vs punto.
  readonly scenarios?: Readonly<Record<string, ScenarioOutput>>;
}

// D29 — resultado per escenario nombrado. value 0-100, rationale opcional
// string corto para UI, confidence per escenario (puede bajar si menos data).
export interface ScenarioOutput {
  readonly value: number;
  readonly confidence: Confidence;
  readonly rationale?: string;
}

// P1 — Validity window por calculator. Expresado en units discretos. persist.ts
// calcula valid_until = computed_at + window al UPSERT si el calculator no lo
// override.
export interface ValidityWindow {
  readonly unit: 'hours' | 'days' | 'months';
  readonly value: number;
}

export interface Calculator<TComponents extends object = Record<string, unknown>> {
  readonly scoreId: string;
  readonly version: string; // semver del calculator
  readonly tier: 1 | 2 | 3 | 4;
  run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput<TComponents>>;
}
