import { posthog } from '@/shared/lib/telemetry/posthog';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface TrackGenerationArgs {
  readonly scoreId: string;
  readonly indexCode: string;
  readonly scopeType: string;
  readonly scopeId: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly costUsd: number;
  readonly cached: boolean;
  readonly durationMs: number;
}

export function trackCausalGeneration(args: TrackGenerationArgs, distinctId?: string): void {
  const props = {
    score_id: args.scoreId,
    index_code: args.indexCode,
    scope_type: args.scopeType,
    scope_id: args.scopeId,
    model: args.model,
    prompt_version: args.promptVersion,
    tokens_in: args.tokensIn,
    tokens_out: args.tokensOut,
    cost_usd: args.costUsd,
    cached: args.cached,
    duration_ms: args.durationMs,
  };
  // eslint-disable-next-line no-console
  console.info('[causal.generated]', JSON.stringify(props));
  posthog.capture({
    distinctId: distinctId ?? 'server',
    event: 'causal.generated',
    properties: props,
  });
}

export type CausalFailureReason =
  | 'llm_call_failed'
  | 'validation_failed'
  | 'citation_invalid'
  | 'cache_persist_failed'
  | 'cost_budget_exceeded';

export interface ReportCausalFailureArgs {
  readonly scoreId: string;
  readonly model?: string;
  readonly reason: CausalFailureReason;
  readonly error: unknown;
}

export function reportCausalFailure(args: ReportCausalFailureArgs): void {
  const tags: Record<string, string> = {
    feature: 'causal-engine',
    reason: args.reason,
  };
  if (args.model) {
    tags.model = args.model;
  }
  sentry.captureException(args.error, {
    tags,
    extra: { score_id: args.scoreId },
  });
  // eslint-disable-next-line no-console
  console.error(
    '[causal.failed]',
    args.reason,
    args.error instanceof Error ? args.error.message : args.error,
  );
}
