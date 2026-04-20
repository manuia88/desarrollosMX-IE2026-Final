// Persistencia de scores — UPSERT en zone_scores / project_scores / user_scores.
// Tablas creadas en migration BLOQUE 8.A.3. Provenance (U4) se escribe
// directo desde CalculatorOutput.provenance.
//
// Las 3 funciones respetan UNIQUE(entity_id, score_type, period_date) y el
// trigger archive_score_before_update (BEFORE UPDATE) inserta la fila anterior
// en score_history automáticamente — no se llama explícitamente desde aquí.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoreRegistryEntry } from '../registry';
import type { CalculatorInput, CalculatorOutput } from './base';

// Tipado laxo porque las tablas zone_scores/project_scores/user_scores/score_history
// se crean en la migration de BLOQUE 8.A.3 y los types se regeneran después.
// Usamos from(name as never) para evitar TS2345 hasta que db:types corra.
type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

export interface PersistResult {
  readonly ok: boolean;
  readonly error?: string;
}

function buildRow(
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
  entityColumn: 'zone_id' | 'project_id' | 'user_id',
  entityId: string,
): Record<string, unknown> {
  return {
    [entityColumn]: entityId,
    country_code: input.countryCode,
    score_type: registry.score_id,
    score_value: output.score_value,
    score_label: output.score_label,
    level: registry.level,
    tier: registry.tier,
    confidence: output.confidence,
    components: output.components,
    inputs_used: output.inputs_used,
    citations: output.citations,
    provenance: output.provenance,
    trend_vs_previous: output.trend_vs_previous ?? null,
    trend_direction: output.trend_direction ?? null,
    period_date: input.periodDate,
    computed_at: new Date().toISOString(),
  };
}

export async function persistZoneScore(
  supabase: SupabaseClient,
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
): Promise<PersistResult> {
  if (!input.zoneId) return { ok: false, error: 'zoneId required for zone score' };
  const row = buildRow(output, registry, input, 'zone_id', input.zoneId);
  const { error } = await castFrom(supabase, 'zone_scores').upsert(row as never, {
    onConflict: 'zone_id,score_type,period_date',
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function persistProjectScore(
  supabase: SupabaseClient,
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
): Promise<PersistResult> {
  if (!input.projectId) return { ok: false, error: 'projectId required for project score' };
  const row = buildRow(output, registry, input, 'project_id', input.projectId);
  const { error } = await castFrom(supabase, 'project_scores').upsert(row as never, {
    onConflict: 'project_id,score_type,period_date',
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function persistUserScore(
  supabase: SupabaseClient,
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
): Promise<PersistResult> {
  if (!input.userId) return { ok: false, error: 'userId required for user score' };
  const row = buildRow(output, registry, input, 'user_id', input.userId);
  const { error } = await castFrom(supabase, 'user_scores').upsert(row as never, {
    onConflict: 'user_id,score_type,period_date',
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
