import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { assertAllowedSource } from './allowlist';
import {
  recordFailure as breakerRecordFailure,
  recordSuccess as breakerRecordSuccess,
  checkCircuit,
} from './circuit-breaker';
import { newCorrelationId, startIngestSpan } from './correlation';
import { preCheckBudget, recordSpend } from './cost-tracker';
import { saveRawPayload } from './replay';
import { withRetry } from './retry';
import { getDefaultSamplePercentage } from './sampler';
import {
  BudgetExceededError,
  CircuitOpenError,
  type IngestCtx,
  type IngestJob,
  type IngestResult,
  SourceNotAllowedError,
} from './types';
import { bumpWatermark } from './watermarks';

export interface RunIngestOptions {
  retries?: number;
  saveRaw?: boolean;
  bumpWatermarkOnSuccess?: { periodEnd: string } | null;
}

// Entry point del pipeline. Cada ingestor define un IngestJob y lo pasa
// a runIngest. El orchestrator agrega:
//   1. Allowlist guard (ALLOWED_SOURCES + Habi block)
//   2. Cost tracker pre-check (BudgetExceededError)
//   3. Circuit breaker per source
//   4. Correlation ID + OTel span
//   5. ingest_runs row creation + finalization
//   6. Retry exponencial con backoff
//   7. Raw payload persist (replay support)
//   8. Watermark bump on success
//   9. Sentry capture on failure
//   10. data_lineage es responsabilidad del ingestor (lineage.ts helper)
export async function runIngest<T>(
  job: IngestJob<T>,
  options: RunIngestOptions = {},
): Promise<IngestResult> {
  const { retries = 3, saveRaw = true, bumpWatermarkOnSuccess = null } = options;

  assertAllowedSource(job.source);

  const supabase = createAdminClient();
  const runId = newCorrelationId();
  const samplePercentage = job.samplePercentage ?? getDefaultSamplePercentage();
  const startedAt = new Date();

  const ctx: IngestCtx = {
    runId,
    source: job.source,
    countryCode: job.countryCode,
    samplePercentage,
    triggeredBy: job.triggeredBy ?? null,
    startedAt,
  };

  // Insert ingest_runs row con id = correlation_id.
  await supabase.from('ingest_runs').insert({
    id: runId,
    source: job.source,
    country_code: job.countryCode,
    status: 'running',
    sample_percentage: samplePercentage,
    triggered_by: job.triggeredBy ?? null,
    started_at: startedAt.toISOString(),
    meta: { estimated_cost_usd: job.estimatedCostUsd ?? 0 },
  });

  const span = startIngestSpan(`ingest.${job.source}`, {
    'ingest.run_id': runId,
    'ingest.source': job.source,
    'ingest.country_code': job.countryCode,
    'ingest.sample_pct': samplePercentage,
  });

  try {
    if (typeof job.estimatedCostUsd === 'number' && job.estimatedCostUsd > 0) {
      const budget = await preCheckBudget(job.source, job.estimatedCostUsd);
      if (budget.alertThresholdReached) {
        sentry.captureException(new Error(`api_budget_alert:${job.source}`), {
          tags: { source: job.source, run_id: runId },
          extra: budget as unknown as Record<string, unknown>,
        });
      }
    }

    checkCircuit(job.source);

    const result = await withRetry(() => job.run(ctx), {
      retries,
      shouldRetry: (err) =>
        !(err instanceof SourceNotAllowedError) &&
        !(err instanceof BudgetExceededError) &&
        !(err instanceof CircuitOpenError),
      onRetry: (err, attempt, wait) => {
        sentry.captureException(err, {
          tags: { source: job.source, run_id: runId, attempt: String(attempt) },
          extra: { retry_in_ms: wait },
        });
      },
    });

    // Raw payload persist (replay support).
    let rawPayloadUrl: string | undefined;
    if (saveRaw && result.rawPayload != null) {
      const saved = await saveRawPayload(runId, job.source, result.rawPayload);
      if (saved) rawPayloadUrl = saved.url;
    }

    // Cost reporting.
    if (typeof result.cost_estimated_usd === 'number' && result.cost_estimated_usd > 0) {
      await recordSpend(job.source, result.cost_estimated_usd);
    }

    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();
    const status = result.errors.length > 0 ? 'partial' : 'success';

    await supabase
      .from('ingest_runs')
      .update({
        status,
        rows_inserted: result.rows_inserted,
        rows_updated: result.rows_updated,
        rows_skipped: result.rows_skipped,
        rows_dlq: result.rows_dlq,
        error: result.errors.length > 0 ? result.errors.join('\n') : null,
        completed_at: completedAt.toISOString(),
        duration_ms: duration,
        cost_estimated_usd: result.cost_estimated_usd ?? 0,
        raw_payload_url: rawPayloadUrl ?? null,
        meta: (result.meta ?? {}) as never,
      })
      .eq('id', runId);

    breakerRecordSuccess(job.source);
    if (bumpWatermarkOnSuccess) {
      await bumpWatermark({
        source: job.source,
        countryCode: job.countryCode,
        runId,
        periodEnd: bumpWatermarkOnSuccess.periodEnd,
      });
    }

    span.end({ 'ingest.status': status, 'ingest.rows': result.rows_inserted });
    const final: IngestResult = { ...result };
    if (rawPayloadUrl !== undefined) final.raw_payload_url = rawPayloadUrl;
    return final;
  } catch (err) {
    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();
    const isBudgetErr = err instanceof BudgetExceededError;
    const status = isBudgetErr ? 'budget_exceeded' : 'failed';
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabase
      .from('ingest_runs')
      .update({
        status,
        error: errorMsg,
        completed_at: completedAt.toISOString(),
        duration_ms: duration,
      })
      .eq('id', runId);

    if (!(err instanceof SourceNotAllowedError) && !isBudgetErr) {
      breakerRecordFailure(job.source);
    }

    sentry.captureException(err, {
      tags: { source: job.source, run_id: runId, status },
    });

    span.end({ 'ingest.status': status, 'ingest.error': errorMsg });
    throw err;
  }
}

export type { IngestCtx, IngestJob, IngestResult } from './types';
