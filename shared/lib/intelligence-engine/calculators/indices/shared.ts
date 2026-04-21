// Helpers transversales para los 5 índices DMX (MOM, LIV, FAM, YNG, GRN).
// Centraliza upgrades FASE 11 XL:
//   - Explainability-ready: shape ComponentDetail con citation_source+period.
//   - Confidence granular 0-100 (confidence_breakdown).
//   - Audit log hook best-effort (tryInsertAuditLog).
//   - Circuit breaker detector (Δ% vs último snapshot).
//   - Fetch snapshot anterior desde score_history para trend.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Confidence } from '../base';

type LooseClient = SupabaseClient<Record<string, unknown>>;

export function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// Confidence breakdown granular 0-100 — per FASE 11 XL upgrades.
// data_freshness: penaliza edad del dato (>90d = 0; fresco <7d = 100).
// data_completeness: coverage_pct directo.
// sample_size: log-scale hacia 100 colonias o equivalente.
// methodology_maturity: constante por calculator (85 default).
export interface ConfidenceBreakdown extends Record<string, number> {
  readonly data_freshness: number;
  readonly data_completeness: number;
  readonly sample_size: number;
  readonly methodology_maturity: number;
  readonly overall: number;
}

export interface ConfidenceBreakdownInput {
  readonly data_freshness_days?: number | undefined;
  readonly coverage_pct: number;
  readonly sample_size?: number | undefined;
  readonly methodology_maturity?: number | undefined;
}

export function buildConfidenceBreakdown(input: ConfidenceBreakdownInput): ConfidenceBreakdown {
  const freshness = (() => {
    if (input.data_freshness_days === undefined) return 70;
    const age = Math.max(0, input.data_freshness_days);
    if (age >= 90) return 0;
    if (age <= 7) return 100;
    return Math.round(100 - ((age - 7) / (90 - 7)) * 100);
  })();
  const completeness = Math.round(clamp100(input.coverage_pct));
  const sample = (() => {
    if (input.sample_size === undefined) return 70;
    const n = Math.max(0, input.sample_size);
    if (n <= 0) return 0;
    if (n >= 100) return 100;
    return Math.round((Math.log10(n + 1) / Math.log10(101)) * 100);
  })();
  const maturity = Math.round(clamp100(input.methodology_maturity ?? 85));
  const overall = Math.round(
    freshness * 0.25 + completeness * 0.35 + sample * 0.2 + maturity * 0.2,
  );
  return {
    data_freshness: freshness,
    data_completeness: completeness,
    sample_size: sample,
    methodology_maturity: maturity,
    overall,
  };
}

// Circuit breaker: detecta cambio brusco vs snapshot anterior. Spec FASE 11 XL
// = Δ > 20% (absoluto) dispara flag para revisión humana.
export function detectCircuitBreaker(
  current: number,
  previous: number | null,
  thresholdPct: number,
): boolean {
  if (previous === null || !Number.isFinite(previous)) return false;
  if (Math.abs(current - previous) > thresholdPct) return true;
  return false;
}

// Fetch último snapshot del score en score_history para trend + circuit breaker.
// Best-effort — devuelve null si falla o no existe.
export async function fetchPreviousSnapshot(
  supabase: SupabaseClient,
  entityType: 'zone' | 'project',
  entityId: string,
  scoreType: string,
  beforePeriodDate: string,
): Promise<number | null> {
  try {
    const { data, error } = await (supabase as unknown as LooseClient)
      .from('score_history' as never)
      .select('score_value, period_date')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('score_type', scoreType)
      .lt('period_date', beforePeriodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (error || !data) return null;
    const rows = data as unknown as Array<{ score_value: number }>;
    const first = rows[0];
    if (!first || typeof first.score_value !== 'number' || !Number.isFinite(first.score_value)) {
      return null;
    }
    return first.score_value;
  } catch {
    return null;
  }
}

// Meta object que va dentro de components._meta para cada índice.
export interface IndicesMeta extends Record<string, unknown> {
  readonly confidence_breakdown: ConfidenceBreakdown;
  readonly circuit_breaker_triggered: boolean;
  readonly shadow: boolean;
  readonly nowcast_partial?: boolean | undefined;
  readonly periods_covered?: number | undefined;
  readonly fallback_reason?: string | undefined;
  readonly weights_used?: Readonly<Record<string, number>> | undefined;
  readonly missing_components?: readonly string[] | undefined;
  readonly redistributed_weights?: boolean | undefined;
  readonly limitation?: string | undefined;
}

// Audit log row schema — si la tabla dmx_indices_audit_log existe, se insertará.
// Si no, el INSERT falla silenciosamente (best-effort).
export interface AuditLogParams {
  readonly score_id: string;
  readonly entity_type: 'zone' | 'project';
  readonly entity_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly score_value: number;
  readonly confidence: Confidence;
  readonly computed_at: string;
  readonly calculator_version: string;
  readonly inputs_hash: string;
}

export async function tryInsertAuditLog(
  supabase: SupabaseClient,
  params: AuditLogParams,
): Promise<void> {
  try {
    await (supabase as unknown as LooseClient)
      .from('dmx_indices_audit_log' as never)
      .insert(params as never);
  } catch {
    // best-effort — no bloquea el cálculo principal.
  }
}

// Shape estandarizado para cada pieza de un índice compuesto.
// Permite a UI de /metodologia render citation inline sin inferencia.
export interface IndexComponentDetail extends Record<string, unknown> {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
}
