import { generateText, type ModelMessage } from 'ai';
import {
  captureAIQueryCompleted,
  captureAIQueryFailed,
  captureAIQueryStarted,
  estimateCostUsd,
} from '@/shared/lib/telemetry/events';
import { MODEL_REGISTRY, type ModelCategory, resolveModel } from './providers';

type GenerateOpts = {
  category: ModelCategory;
  messages: ModelMessage[];
  userId: string;
  session?: string;
  fallbackCategory?: ModelCategory;
  maxOutputTokens?: number;
};

function modelIdFor(category: ModelCategory): string {
  // Cada LanguageModel expone modelId en v6.
  return (MODEL_REGISTRY[category] as unknown as { modelId: string }).modelId;
}

export async function generateAI(opts: GenerateOpts) {
  const start = Date.now();
  const model = modelIdFor(opts.category);

  captureAIQueryStarted(opts.userId, {
    category: opts.category,
    model,
  });

  try {
    const res = await generateText({
      model: resolveModel(opts.category),
      messages: opts.messages,
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    });

    const tokens_in = res.usage?.inputTokens;
    const tokens_out = res.usage?.outputTokens;

    captureAIQueryCompleted(opts.userId, {
      category: opts.category,
      model,
      latency_ms: Date.now() - start,
      ...(tokens_in !== undefined ? { tokens_in } : {}),
      ...(tokens_out !== undefined ? { tokens_out } : {}),
      cost_usd: estimateCostUsd({
        model,
        ...(tokens_in !== undefined ? { tokensIn: tokens_in } : {}),
        ...(tokens_out !== undefined ? { tokensOut: tokens_out } : {}),
      }),
    });

    return res;
  } catch (err) {
    captureAIQueryFailed(opts.userId, err, {
      category: opts.category,
      model,
      latency_ms: Date.now() - start,
    });

    if (opts.fallbackCategory) {
      return generateText({
        model: resolveModel(opts.fallbackCategory),
        messages: opts.messages,
        ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
      });
    }

    throw err;
  }
}
