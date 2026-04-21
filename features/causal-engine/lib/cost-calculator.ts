import { estimateCostUsd, MODEL_PRICING_USD_PER_MTOK } from '@/shared/lib/telemetry/events';

export interface CostEstimateInput {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

// Sonnet 4.5 is the primary causal-engine model; the shared pricing table
// tracks sonnet-4-6/opus-4-7/haiku-4-5. Fall back to sonnet-4-6 pricing when
// the exact tag is missing so we never silently report $0.
const SONNET_4_5_ALIAS = 'claude-sonnet-4-5';
const SONNET_FALLBACK = 'claude-sonnet-4-6';

export function estimateCost({ model, inputTokens, outputTokens }: CostEstimateInput): number {
  const pricingKey =
    model === SONNET_4_5_ALIAS && !MODEL_PRICING_USD_PER_MTOK[model] ? SONNET_FALLBACK : model;
  return estimateCostUsd({
    model: pricingKey,
    tokensIn: inputTokens,
    tokensOut: outputTokens,
  });
}

export { MODEL_PRICING_USD_PER_MTOK };
