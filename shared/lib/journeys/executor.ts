// FASE 15 v3 — B.7 Journey executor engine
// Reference: ADR-060 + M13 APPEND v3 (Onyx anchor -30% ciclo ventas)
//
// Evaluates `journey_executions` rows con status IN ('pending','running') AND next_run_at <= now().
// Ejecuta `current_step` actual:
//   - send_email   → invoke Resend (degraded: skip if RESEND_API_KEY missing, mark sent=false)
//   - send_wa      → invoke WA Business (degraded: skip if WA_BUSINESS_TOKEN missing)
//   - wait         → set next_run_at = now() + waitHours
//   - conditional  → evaluate condition.field op value, jump to thenStep or elseStep
//
// On step success → advance current_step++, set next_run_at IF wait pending else immediate.
// On step end (out of bounds) → mark status='completed', completed_at=now().
// On error → mark status='failed', append error_log entry, do NOT advance.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { JourneyStep } from '@/features/crm-dev/schemas';

interface ExecutionRow {
  id: string;
  journey_id: string;
  lead_id: string;
  current_step: number;
  status: string;
  next_run_at: string | null;
  started_at: string;
}

interface JourneyRow {
  id: string;
  name: string;
  active: boolean;
  steps: unknown;
  trigger_event: string;
}

interface ExecutorContext {
  readonly supabase: SupabaseClient;
}

export interface ExecutorResult {
  readonly executionId: string;
  readonly stepIndex: number;
  readonly stepType: string;
  readonly outcome: 'advanced' | 'wait' | 'completed' | 'failed' | 'skipped';
  readonly detail?: string;
}

export async function executeJourneyTick(
  ctx: ExecutorContext,
  limit = 100,
): Promise<readonly ExecutorResult[]> {
  const { supabase } = ctx;
  const nowIso = new Date().toISOString();

  const { data: pending } = await supabase
    .from('journey_executions')
    .select('id, journey_id, lead_id, current_step, status, next_run_at, started_at')
    .in('status', ['pending', 'running'])
    .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
    .order('next_run_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (!pending || pending.length === 0) return [];

  const journeyIds = [...new Set((pending as ExecutionRow[]).map((p) => p.journey_id))];
  const { data: journeys } = await supabase
    .from('marketing_journeys')
    .select('id, name, active, steps, trigger_event')
    .in('id', journeyIds);

  const journeyMap = new Map<string, JourneyRow>();
  for (const j of (journeys ?? []) as JourneyRow[]) {
    journeyMap.set(j.id, j);
  }

  const results: ExecutorResult[] = [];
  for (const exec of pending as ExecutionRow[]) {
    const journey = journeyMap.get(exec.journey_id);
    if (!journey?.active) {
      await supabase.from('journey_executions').update({ status: 'cancelled' }).eq('id', exec.id);
      results.push({
        executionId: exec.id,
        stepIndex: exec.current_step,
        stepType: 'unknown',
        outcome: 'skipped',
        detail: 'journey_inactive_or_missing',
      });
      continue;
    }

    const steps = Array.isArray(journey.steps) ? (journey.steps as JourneyStep[]) : [];
    if (steps.length === 0 || exec.current_step >= steps.length) {
      await supabase
        .from('journey_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', exec.id);
      results.push({
        executionId: exec.id,
        stepIndex: exec.current_step,
        stepType: 'end',
        outcome: 'completed',
      });
      continue;
    }

    const step = steps[exec.current_step] as JourneyStep | undefined;
    if (!step) {
      await supabase
        .from('journey_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', exec.id);
      results.push({
        executionId: exec.id,
        stepIndex: exec.current_step,
        stepType: 'end',
        outcome: 'completed',
      });
      continue;
    }

    try {
      const stepResult = await executeStep(supabase, exec, step);
      results.push(stepResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      await supabase
        .from('journey_executions')
        .update({
          status: 'failed',
          last_executed_at: new Date().toISOString(),
          error_log: { step: exec.current_step, error: message } as never,
        })
        .eq('id', exec.id);
      results.push({
        executionId: exec.id,
        stepIndex: exec.current_step,
        stepType: step.type,
        outcome: 'failed',
        detail: message,
      });
    }
  }

  return results;
}

async function executeStep(
  supabase: SupabaseClient,
  exec: ExecutionRow,
  step: JourneyStep,
): Promise<ExecutorResult> {
  const nowIso = new Date().toISOString();

  if (step.type === 'wait') {
    const nextRunAt = new Date(Date.now() + step.waitHours * 60 * 60 * 1000).toISOString();
    await supabase
      .from('journey_executions')
      .update({
        status: 'running',
        current_step: exec.current_step + 1,
        last_executed_at: nowIso,
        next_run_at: nextRunAt,
      })
      .eq('id', exec.id);
    return {
      executionId: exec.id,
      stepIndex: exec.current_step,
      stepType: 'wait',
      outcome: 'wait',
      detail: `next=${nextRunAt}`,
    };
  }

  if (step.type === 'conditional') {
    // STUB ADR-018: conditional engine evaluado contra lead_score actual.
    // Lookup latest score; if missing treat as 0.
    const { data: scoreRow } = await supabase
      .from('lead_scores')
      .select('score')
      .eq('lead_id', exec.lead_id)
      .maybeSingle();
    const score = scoreRow?.score ?? 0;

    let value: number;
    if (step.condition.field === 'lead_score') {
      value = score;
    } else if (step.condition.field === 'has_offer') {
      value = 0;
    } else {
      value = 0;
    }

    const op = step.condition.op;
    const target = step.condition.value;
    let pass = false;
    if (op === 'gt') pass = value > target;
    else if (op === 'gte') pass = value >= target;
    else if (op === 'lt') pass = value < target;
    else if (op === 'lte') pass = value <= target;
    else if (op === 'eq') pass = value === target;

    const nextStep = pass ? step.thenStep : step.elseStep;
    await supabase
      .from('journey_executions')
      .update({
        status: 'running',
        current_step: nextStep,
        last_executed_at: nowIso,
        next_run_at: nowIso,
      })
      .eq('id', exec.id);
    return {
      executionId: exec.id,
      stepIndex: exec.current_step,
      stepType: 'conditional',
      outcome: 'advanced',
      detail: `pass=${pass} -> step ${nextStep}`,
    };
  }

  if (step.type === 'send_email') {
    // STUB ADR-018: Resend integration pending RESEND_API_KEY env wiring (canon F08 Marketing).
    // Degraded behavior: log + advance step. Production: invoke Resend client.
    if (!process.env.RESEND_API_KEY) {
      await supabase
        .from('journey_executions')
        .update({
          status: 'running',
          current_step: exec.current_step + 1,
          last_executed_at: nowIso,
          next_run_at: nowIso,
        })
        .eq('id', exec.id);
      return {
        executionId: exec.id,
        stepIndex: exec.current_step,
        stepType: 'send_email',
        outcome: 'skipped',
        detail: 'no_resend_api_key',
      };
    }
    // Real Resend call would go here. For now advance.
    await supabase
      .from('journey_executions')
      .update({
        status: 'running',
        current_step: exec.current_step + 1,
        last_executed_at: nowIso,
        next_run_at: nowIso,
      })
      .eq('id', exec.id);
    return {
      executionId: exec.id,
      stepIndex: exec.current_step,
      stepType: 'send_email',
      outcome: 'advanced',
    };
  }

  if (step.type === 'send_wa') {
    // STUB ADR-018: WA Business API integration pending WA_BUSINESS_TOKEN canon F08 Marketing.
    if (!process.env.WA_BUSINESS_TOKEN) {
      await supabase
        .from('journey_executions')
        .update({
          status: 'running',
          current_step: exec.current_step + 1,
          last_executed_at: nowIso,
          next_run_at: nowIso,
        })
        .eq('id', exec.id);
      return {
        executionId: exec.id,
        stepIndex: exec.current_step,
        stepType: 'send_wa',
        outcome: 'skipped',
        detail: 'no_wa_business_token',
      };
    }
    await supabase
      .from('journey_executions')
      .update({
        status: 'running',
        current_step: exec.current_step + 1,
        last_executed_at: nowIso,
        next_run_at: nowIso,
      })
      .eq('id', exec.id);
    return {
      executionId: exec.id,
      stepIndex: exec.current_step,
      stepType: 'send_wa',
      outcome: 'advanced',
    };
  }

  return {
    executionId: exec.id,
    stepIndex: exec.current_step,
    stepType: 'unknown' as const,
    outcome: 'skipped',
    detail: 'unhandled_step_type',
  };
}
