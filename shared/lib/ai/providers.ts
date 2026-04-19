import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

export const MODEL_REGISTRY = {
  primary: anthropicProvider('claude-sonnet-4-6'),
  fast: openaiProvider('gpt-4o-mini'),
  legal: anthropicProvider('claude-sonnet-4-6'),
  financial: anthropicProvider('claude-sonnet-4-6'),
  match: anthropicProvider('claude-sonnet-4-6'),
  marketing: openaiProvider('gpt-4o-mini'),
  simple_task: openaiProvider('gpt-4o-mini'),
  haiku: anthropicProvider('claude-haiku-4-5'),
} as const;

export type ModelCategory = keyof typeof MODEL_REGISTRY;

export function resolveModel(category: ModelCategory) {
  return MODEL_REGISTRY[category];
}

export const EMBEDDING_MODEL = openaiProvider.textEmbeddingModel('text-embedding-3-small');
