import { generateText, type ModelMessage } from 'ai';
import { posthog } from '@/shared/lib/telemetry/posthog';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { type ModelCategory, resolveModel } from './providers';

type GenerateOpts = {
  category: ModelCategory;
  messages: ModelMessage[];
  userId: string;
  session?: string;
  fallbackCategory?: ModelCategory;
  maxOutputTokens?: number;
};

export async function generateAI(opts: GenerateOpts) {
  const start = Date.now();

  posthog.capture({
    distinctId: opts.userId,
    event: 'ai_query_started',
    properties: { category: opts.category, session: opts.session },
  });

  try {
    const res = await generateText({
      model: resolveModel(opts.category),
      messages: opts.messages,
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    });

    posthog.capture({
      distinctId: opts.userId,
      event: 'ai_query_completed',
      properties: {
        category: opts.category,
        tokens_in: res.usage?.inputTokens,
        tokens_out: res.usage?.outputTokens,
        ms: Date.now() - start,
      },
    });

    return res;
  } catch (err) {
    sentry.captureException(err, {
      tags: { 'ai.category': opts.category, 'ai.user_id': opts.userId },
    });

    posthog.capture({
      distinctId: opts.userId,
      event: 'ai_query_failed',
      properties: {
        category: opts.category,
        ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      },
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
