import { createAdminClient } from '@/shared/lib/supabase/admin';
import { preCheckBudget, recordSpend } from '../cost-tracker';
import { AIRROI_ENDPOINTS, type AirroiEndpointKey } from './airroi-pricing';

// U5 granular cost tracker for AirROI.
//
// Dos efectos por cada call AirROI (REST o MCP):
//
//   1. api_budgets.airroi.spent_mtd_usd += estimated_cost_usd
//      (mecanismo existente cost-tracker.recordSpend → enforcement del
//       hard cap $500/mo a nivel agregado).
//
//   2. INSERT en airroi_spend_ledger con granularidad por endpoint_key
//      (para dashboards admin, reconciliación Developer Dashboard,
//      hotspot detection, y analytics de qué endpoints dominan el spend).
//
// El pre-check (preCheckBudget) y el record (recordSpend) corren en el
// orchestrator runIngest, pero cuando un ingestor STR hace múltiples calls
// dentro del mismo run (pagination, bulk, per-listing metrics) necesita
// llamar a esta función por cada call — no por run.

export interface AirroiCallContext {
  endpointKey: AirroiEndpointKey;
  runId?: string | undefined;
  countryCode?: string | undefined;
  marketRef?: string | undefined; // e.g. "Roma Sur" / "Mexico City"
  airroiRequestId?: string | undefined; // x-amzn-requestid
  httpStatus?: number | undefined;
  durationMs?: number | undefined;
  ok: boolean;
  error?: string | undefined;
  actualCostUsd?: number | undefined; // only set if header/dashboard reconciled
  meta?: Record<string, unknown> | undefined;
}

// Gate pre-call. Llamar antes de hacer fetch; lanza BudgetExceededError si
// el call empujaría el monthly spend sobre hard_limit_pct.
export async function preCheckAirroiEndpoint(endpointKey: AirroiEndpointKey): Promise<void> {
  const spec = AIRROI_ENDPOINTS[endpointKey];
  await preCheckBudget('airroi', spec.estimated_cost_usd);
}

// Log post-call. Inserta el ledger row y (si ok + costo>0) agrega al api_budgets.
// Nunca throws — logger failures no deben bloquear el pipeline de ingesta.
export async function logAirroiCall(ctx: AirroiCallContext): Promise<void> {
  const spec = AIRROI_ENDPOINTS[ctx.endpointKey];
  const supabase = createAdminClient();

  const costToBook = ctx.ok ? (ctx.actualCostUsd ?? spec.estimated_cost_usd) : 0;

  try {
    await supabase.from('airroi_spend_ledger').insert({
      endpoint_key: ctx.endpointKey,
      endpoint_path: spec.path,
      method: spec.method,
      estimated_cost_usd: spec.estimated_cost_usd,
      actual_cost_usd: ctx.actualCostUsd ?? null,
      airroi_request_id: ctx.airroiRequestId ?? null,
      http_status: ctx.httpStatus ?? null,
      run_id: ctx.runId ?? null,
      country_code: ctx.countryCode ?? null,
      market_ref: ctx.marketRef ?? null,
      duration_ms: ctx.durationMs ?? null,
      ok: ctx.ok,
      error: ctx.error ?? null,
      meta: (ctx.meta ?? {}) as never,
    });
  } catch {
    // swallow — ledger es best-effort.
  }

  if (costToBook > 0) {
    await recordSpend('airroi', costToBook);
  }
}
