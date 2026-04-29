// FASE 17.D OpenAI embeddings wrapper — text-embedding-3-small (1536 dim)
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Pricing canon: $0.02 per 1M tokens (text-embedding-3-small).
// Stub mode si OPENAI_API_KEY=='sk_test_stub' o missing → genera vector
// determinístico hash-based (testing offline / CI sin coste).

import { embed, embedMany } from 'ai';
import { EMBEDDING_MODEL } from '@/shared/lib/ai/providers';

export const EMBEDDING_DIMENSIONS = 1536 as const;
export const EMBEDDING_MODEL_NAME = 'text-embedding-3-small' as const;
export const EMBEDDING_PRICE_PER_M_TOKENS = 0.02;

export interface EmbeddingTelemetry {
  readonly tokens_used: number;
  readonly cost_usd: number;
  readonly model: string;
  readonly stub: boolean;
}

export interface EmbeddingResult {
  readonly embedding: number[];
  readonly telemetry: EmbeddingTelemetry;
}

export interface EmbeddingsResult {
  readonly embeddings: number[][];
  readonly telemetry: EmbeddingTelemetry;
}

function isStubMode(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !key || key === 'sk_test_stub';
}

function approximateTokenCount(text: string): number {
  // Heurística canon ~4 chars/token (OpenAI tokenizer cl100k_base average español/inglés).
  return Math.max(1, Math.ceil(text.length / 4));
}

function calculateCostUsd(tokens: number): number {
  return Number(((tokens * EMBEDDING_PRICE_PER_M_TOKENS) / 1_000_000).toFixed(8));
}

function stubVector(seedText: string): number[] {
  // Determinístico: simple hash-based vector unitario aproximado.
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const vec = new Array<number>(EMBEDDING_DIMENSIONS);
  let acc = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i += 1) {
    h = Math.imul(h ^ (h >>> 13), 1540483477);
    h ^= h >>> 16;
    const v = ((h & 0xffff) / 0xffff) * 2 - 1;
    vec[i] = v;
    acc += v * v;
  }
  const norm = Math.sqrt(acc) || 1;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i += 1) {
    const current = vec[i] ?? 0;
    vec[i] = current / norm;
  }
  return vec;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (isStubMode()) {
    const tokens = approximateTokenCount(text);
    return {
      embedding: stubVector(text),
      telemetry: {
        tokens_used: tokens,
        cost_usd: 0,
        model: `${EMBEDDING_MODEL_NAME}-stub`,
        stub: true,
      },
    };
  }

  const { embedding, usage } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  });
  const tokens = usage?.tokens ?? approximateTokenCount(text);
  return {
    embedding,
    telemetry: {
      tokens_used: tokens,
      cost_usd: calculateCostUsd(tokens),
      model: EMBEDDING_MODEL_NAME,
      stub: false,
    },
  };
}

export async function generateEmbeddings(texts: ReadonlyArray<string>): Promise<EmbeddingsResult> {
  if (texts.length === 0) {
    return {
      embeddings: [],
      telemetry: {
        tokens_used: 0,
        cost_usd: 0,
        model: EMBEDDING_MODEL_NAME,
        stub: isStubMode(),
      },
    };
  }

  if (isStubMode()) {
    const tokens = texts.reduce((sum, t) => sum + approximateTokenCount(t), 0);
    return {
      embeddings: texts.map((t) => stubVector(t)),
      telemetry: {
        tokens_used: tokens,
        cost_usd: 0,
        model: `${EMBEDDING_MODEL_NAME}-stub`,
        stub: true,
      },
    };
  }

  const { embeddings, usage } = await embedMany({
    model: EMBEDDING_MODEL,
    values: [...texts],
  });
  const tokens = usage?.tokens ?? texts.reduce((sum, t) => sum + approximateTokenCount(t), 0);
  return {
    embeddings,
    telemetry: {
      tokens_used: tokens,
      cost_usd: calculateCostUsd(tokens),
      model: EMBEDDING_MODEL_NAME,
      stub: false,
    },
  };
}

export function embeddingToPgVector(vector: ReadonlyArray<number>): string {
  return `[${vector.join(',')}]`;
}
