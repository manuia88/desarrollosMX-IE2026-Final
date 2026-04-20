// runScore — wrapper orquestador del framework IE (plan 8.A.2.5).
// Flow: load registry → validate country → tierGate → load calculator →
// .run() → validate provenance (U4) → persist → enqueue downstream →
// score_history append (via BEFORE UPDATE trigger, transparente) →
// PostHog event ie.score.calculated.

import type { SupabaseClient } from '@supabase/supabase-js';
import { recordSpend } from '@/shared/lib/ingest/cost-tracker';
import { hashUserIdForTelemetry } from '@/shared/lib/telemetry/hash-user-id';
import { posthog } from '@/shared/lib/telemetry/posthog';
import { SupabaseScoreQueue } from '../queue';
import { getScoreById, type ScoreRegistryEntry } from '../registry';
import type { Calculator, CalculatorInput, CalculatorOutput } from './base';
import {
  type PersistResult,
  persistProjectScore,
  persistUserScore,
  persistZoneScore,
} from './persist';
import { type TierGateResult, tierGate } from './tier-gate';
import { isProvenanceValid } from './types';

// Registry de loaders estáticos per scoreId. Pobladas por BLOQUE 8.B/8.C
// conforme se implementen calculators reales. Mientras tanto, para tests
// se pasa `calculatorOverride` o se inyecta vía registerCalculator().
type CalculatorLoader = () => Promise<Calculator>;
const CALCULATOR_LOADERS = new Map<string, CalculatorLoader>();

export function registerCalculator(scoreId: string, loader: CalculatorLoader): void {
  CALCULATOR_LOADERS.set(scoreId, loader);
}

export interface RunScoreOptions {
  readonly calculatorOverride?: Calculator;
  readonly skipEnqueueCascade?: boolean; // util en tests para no golpear RPC
  readonly skipPersist?: boolean;
}

export type RunScoreResult =
  | {
      readonly kind: 'ok';
      readonly output: CalculatorOutput;
      readonly registry: ScoreRegistryEntry;
      readonly persisted: boolean;
    }
  | {
      readonly kind: 'gated';
      readonly gate: TierGateResult;
      readonly registry: ScoreRegistryEntry;
    }
  | {
      readonly kind: 'error';
      readonly error: string;
      readonly registry?: ScoreRegistryEntry;
    };

async function loadCalculator(
  registry: ScoreRegistryEntry,
  override?: Calculator,
): Promise<Calculator | null> {
  if (override) return override;
  const loader = CALCULATOR_LOADERS.get(registry.score_id);
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

function pickPersister(
  registry: ScoreRegistryEntry,
): (
  s: SupabaseClient,
  o: CalculatorOutput,
  r: ScoreRegistryEntry,
  i: CalculatorInput,
) => Promise<PersistResult> {
  // Categoría determina dónde se persiste. comprador → user; proyecto → project;
  // resto (zona, mercado, dev, agregado, producto) → zone_scores por default.
  if (registry.category === 'comprador') return persistUserScore;
  if (registry.category === 'proyecto') return persistProjectScore;
  return persistZoneScore;
}

export async function runScore(
  scoreId: string,
  input: CalculatorInput,
  supabase: SupabaseClient,
  options: RunScoreOptions = {},
): Promise<RunScoreResult> {
  const registry = getScoreById(scoreId);
  if (!registry) {
    return { kind: 'error', error: `unknown_score_id:${scoreId}` };
  }

  if (!registry.country_codes.includes(input.countryCode)) {
    return {
      kind: 'error',
      error: `country_not_supported:${input.countryCode} for ${scoreId}`,
      registry,
    };
  }

  const gate = await tierGate(registry.tier, input.countryCode, supabase);
  if (gate.gated) {
    return { kind: 'gated', gate, registry };
  }

  const calculator = await loadCalculator(registry, options.calculatorOverride);
  if (!calculator) {
    return {
      kind: 'error',
      error: `calculator_not_loaded:${scoreId}`,
      registry,
    };
  }

  const compute_start_ms = performance.now();
  let output: CalculatorOutput;
  try {
    output = await calculator.run(input, supabase);
  } catch (e) {
    return {
      kind: 'error',
      error: e instanceof Error ? e.message : 'calculator_run_failed',
      registry,
    };
  }
  const duration_ms = Math.round(performance.now() - compute_start_ms);

  // U4 — provenance obligatorio. Si el calculator no lo declara, fail explícito.
  if (!isProvenanceValid(output.provenance)) {
    return {
      kind: 'error',
      error: `provenance_invalid_or_missing:${scoreId}`,
      registry,
    };
  }

  let persisted = false;
  if (!options.skipPersist) {
    const persister = pickPersister(registry);
    const result = await persister(supabase, output, registry, input);
    if (!result.ok) {
      return {
        kind: 'error',
        error: `persist_failed:${result.error ?? 'unknown'}`,
        registry,
      };
    }
    persisted = true;
  }

  // Enqueue cascades downstream — scores que dependen de este.
  if (!options.skipEnqueueCascade) {
    try {
      const queue = new SupabaseScoreQueue(supabase);
      // Solo enqueue cuando entity apropiada para el scoreId existe.
      // Downstream scores con `dependencies: [scoreId]` en registry.
      // Iteración manual para evitar import cycles.
      const { SCORE_REGISTRY } = await import('../registry');
      const downstream = SCORE_REGISTRY.filter((e) => e.dependencies.includes(scoreId));
      for (const d of downstream) {
        const entityId = input.zoneId ?? input.projectId ?? input.userId;
        if (!entityId) continue;
        await queue.enqueue({
          scoreId: d.score_id,
          entityType:
            d.category === 'comprador' ? 'user' : d.category === 'proyecto' ? 'project' : 'zone',
          entityId,
          countryCode: input.countryCode,
          triggeredBy: `score:${scoreId}`,
          priority: 5,
        });
      }
    } catch {
      // Queue errors son no-bloqueantes aquí (cascadas llegarán en próximo tick
      // via triggers BD). Log a observabilidad cuando exista.
    }
  }

  // U7 — PostHog event ie.score.calculated con props extendidas + hashed user_id (S2).
  // No-op si NEXT_PUBLIC_POSTHOG_KEY no está set (ver shared/lib/telemetry/posthog.ts).
  emitScoreCalculatedEvent({ input, registry, output, duration_ms });

  return { kind: 'ok', output, registry, persisted };
}

function computeSourceDataAgeDays(
  provenance: CalculatorOutput['provenance'],
  computed_at_ms: number,
): number | null {
  if (!provenance || !Array.isArray(provenance.sources)) return null;
  let max_age_days = 0;
  let any_snapshot = false;
  for (const s of provenance.sources) {
    if (!s.snapshot_date) continue;
    const snap_ms = Date.parse(s.snapshot_date);
    if (Number.isNaN(snap_ms)) continue;
    any_snapshot = true;
    const days = Math.floor((computed_at_ms - snap_ms) / (1000 * 60 * 60 * 24));
    if (days > max_age_days) max_age_days = days;
  }
  return any_snapshot ? max_age_days : null;
}

function emitScoreCalculatedEvent(args: {
  input: CalculatorInput;
  registry: ScoreRegistryEntry;
  output: CalculatorOutput;
  duration_ms: number;
}): void {
  try {
    const { input, registry, output, duration_ms } = args;
    const components_count =
      output.components && typeof output.components === 'object'
        ? Object.keys(output.components).length
        : 0;
    const source_data_age_days = computeSourceDataAgeDays(output.provenance, Date.now());
    const distinctId = input.userId
      ? hashUserIdForTelemetry(input.userId)
      : (input.zoneId ?? input.projectId ?? 'ie-anonymous');
    posthog.capture({
      distinctId,
      event: 'ie.score.calculated',
      properties: {
        score_id: registry.score_id,
        zone_id: input.zoneId ?? null,
        project_id: input.projectId ?? null,
        hashed_user_id: input.userId ? hashUserIdForTelemetry(input.userId) : null,
        value: output.score_value,
        confidence: output.confidence,
        components_count,
        duration_ms,
        source_data_age_days,
        calculator_version: output.provenance?.calculator_version ?? 'unknown',
        country_code: input.countryCode,
      },
    });
  } catch {
    // Telemetría es best-effort — nunca tumba runScore.
  }
}

// U3 — helper exposed para calculators que llaman APIs externas con costo.
// Integra con shared/lib/ingest/cost-tracker: escribe api_budgets + dispara
// alertas si spend > threshold. El calculator registra DESPUÉS del API call.
export async function trackExternalCost(source: string, costUsd: number): Promise<void> {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return;
  await recordSpend(source, costUsd);
}
