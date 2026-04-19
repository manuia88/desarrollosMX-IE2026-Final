import { posthog } from './posthog';
import { sentry } from './sentry';

// Tabla pricing básica (USD / 1M tokens). Actualizar cuando cambien precios.
export const MODEL_PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
};

export type AIUsage = {
  model: string;
  tokensIn?: number;
  tokensOut?: number;
};

export function estimateCostUsd(usage: AIUsage): number {
  const pricing = MODEL_PRICING_USD_PER_MTOK[usage.model];
  if (!pricing) return 0;
  const inCost = ((usage.tokensIn ?? 0) / 1_000_000) * pricing.input;
  const outCost = ((usage.tokensOut ?? 0) / 1_000_000) * pricing.output;
  return Number((inCost + outCost).toFixed(6));
}

type AIQueryEventProps = {
  category: string;
  model?: string;
  latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  country_code?: string;
};

export function captureAIQueryStarted(userId: string, props: AIQueryEventProps): void {
  posthog.capture({ distinctId: userId, event: 'ai_query_started', properties: props });
}

export function captureAIQueryCompleted(userId: string, props: AIQueryEventProps): void {
  posthog.capture({ distinctId: userId, event: 'ai_query_completed', properties: props });
}

export function captureAIQueryFailed(
  userId: string,
  error: unknown,
  props: AIQueryEventProps,
): void {
  posthog.capture({
    distinctId: userId,
    event: 'ai_query_failed',
    properties: {
      ...props,
      error: error instanceof Error ? error.message : String(error),
    },
  });
  sentry.captureException(error, {
    tags: {
      'ai.category': props.category,
      'ai.model': props.model ?? 'unknown',
      'ai.user_id': userId,
    },
  });
}

export function captureUIEvent(
  userId: string | null,
  event:
    | 'copilot_opened'
    | 'copilot_message_sent'
    | 'command_palette_opened'
    | 'voice_started'
    | 'generative_component_rendered'
    | 'memory_recall'
    | 'rag_match',
  properties: Record<string, unknown> = {},
): void {
  posthog.capture({
    distinctId: userId ?? 'anonymous',
    event,
    properties,
  });
}
