import { describe, expect, it, vi } from 'vitest';
import { BudgetExceededError } from '@/shared/lib/ingest/types';
import {
  type PendingReview,
  processSentimentBatch,
  SENTIMENT_CONFIDENCE_THRESHOLD,
} from '../lib/sentiment/sentiment-worker';

function mockReview(overrides: Partial<PendingReview> = {}): PendingReview {
  return {
    id: 1,
    platform: 'airbnb',
    listing_id: 'L1',
    review_id: 'R1',
    review_text:
      'Excelente departamento, muy limpio y bien ubicado. La anfitriona respondió rapido y el wifi era estable para trabajo remoto.',
    language: 'es',
    posted_at: '2026-03-15',
    ...overrides,
  };
}

describe('processSentimentBatch', () => {
  it('procesa reviews válidas y persiste sentiment', async () => {
    const persisted: Array<{ review: PendingReview; sentiment: number }> = [];
    const result = await processSentimentBatch(
      { batchSize: 3 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [
          mockReview({ id: 1, review_id: 'R1' }),
          mockReview({ id: 2, review_id: 'R2' }),
        ],
        callModel: async () => ({
          object: {
            sentiment: 0.8,
            confidence: 0.9,
            source_span: 'muy limpio y bien ubicado',
            topics: ['cleanliness', 'location'],
          },
          usage: { inputTokens: 250, outputTokens: 80 },
        }),
        persistResult: async (review, sentiment) => {
          persisted.push({ review, sentiment: sentiment.sentiment });
        },
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => {
          // no-op
        },
      },
    );

    expect(result.processed).toBe(2);
    expect(result.updated).toBe(2);
    expect(result.rejected_low_confidence).toBe(0);
    expect(persisted).toHaveLength(2);
    expect(persisted[0]?.sentiment).toBe(0.8);
    expect(result.cost_usd_actual).toBeGreaterThan(0);
  });

  it('rechaza review con confidence < threshold', async () => {
    const result = await processSentimentBatch(
      { batchSize: 1 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [mockReview()],
        callModel: async () => ({
          object: {
            sentiment: 0.3,
            confidence: SENTIMENT_CONFIDENCE_THRESHOLD - 0.1,
            source_span: 'muy limpio',
            topics: [],
          },
          usage: { inputTokens: 200, outputTokens: 50 },
        }),
        persistResult: async () => {
          throw new Error('should_not_persist');
        },
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );

    expect(result.rejected_low_confidence).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('rechaza si source_span no aparece literal en el texto (Constitutional AI guard)', async () => {
    const result = await processSentimentBatch(
      { batchSize: 1 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [mockReview()],
        callModel: async () => ({
          object: {
            sentiment: 0.7,
            confidence: 0.9,
            source_span: 'jacuzzi privado y vista al mar', // no aparece en el texto.
            topics: ['amenities'],
          },
          usage: { inputTokens: 200, outputTokens: 60 },
        }),
        persistResult: async () => {
          throw new Error('should_not_persist');
        },
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );

    expect(result.rejected_low_confidence).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('detiene batch al exceder presupuesto', async () => {
    let calls = 0;
    const result = await processSentimentBatch(
      { batchSize: 5 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () =>
          Array.from({ length: 5 }, (_, i) => mockReview({ id: i + 1, review_id: `R${i + 1}` })),
        callModel: async () => {
          calls += 1;
          return {
            object: {
              sentiment: 0.5,
              confidence: 0.9,
              source_span: 'muy limpio',
              topics: ['cleanliness'],
            },
            usage: { inputTokens: 200, outputTokens: 60 },
          };
        },
        persistResult: async () => undefined,
        checkBudget: async () => {
          if (calls < 2) return { allowed: true, alertThresholdReached: false };
          throw new BudgetExceededError('anthropic', 100, 100);
        },
        recordCost: async () => undefined,
      },
    );

    expect(result.stopped_reason).toBe('budget_exceeded');
    expect(result.updated).toBe(2);
    expect(result.processed).toBe(2);
  });

  it('sampler dev-mode salta reviews fuera de la muestra', async () => {
    const result = await processSentimentBatch(
      { batchSize: 4 },
      {
        nodeEnv: 'development',
        random: () => 0.99, // > sample rate → siempre saltar.
        fetchPendingReviews: async () =>
          Array.from({ length: 4 }, (_, i) => mockReview({ id: i + 1, review_id: `R${i + 1}` })),
        callModel: async () => {
          throw new Error('should_not_call_model');
        },
        persistResult: async () => undefined,
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );

    expect(result.skipped_sampler).toBe(4);
    expect(result.processed).toBe(0);
    expect(result.updated).toBe(0);
  });

  it('retorna no_pending_reviews cuando la queue está vacía', async () => {
    const result = await processSentimentBatch(
      { batchSize: 50 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [],
        callModel: async () => {
          throw new Error('should_not_call_model');
        },
        persistResult: async () => undefined,
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );

    expect(result.stopped_reason).toBe('no_pending_reviews');
    expect(result.processed).toBe(0);
  });

  it('rechaza review sin texto / texto muy corto', async () => {
    const result = await processSentimentBatch(
      { batchSize: 3 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [
          mockReview({ id: 1, review_text: null }),
          mockReview({ id: 2, review_text: 'ok!' }),
          mockReview({ id: 3 }),
        ],
        callModel: async () => ({
          object: {
            sentiment: 0.6,
            confidence: 0.9,
            source_span: 'muy limpio y bien ubicado',
            topics: ['cleanliness'],
          },
          usage: { inputTokens: 200, outputTokens: 60 },
        }),
        persistResult: async () => undefined,
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: async () => undefined,
      },
    );

    expect(result.rejected_no_text).toBe(2);
    expect(result.updated).toBe(1);
  });

  it('marca alert_threshold_reached cuando budget guard avisa 80%', async () => {
    const result = await processSentimentBatch(
      { batchSize: 1 },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [mockReview()],
        callModel: async () => ({
          object: {
            sentiment: 0.5,
            confidence: 0.9,
            source_span: 'muy limpio',
            topics: [],
          },
          usage: { inputTokens: 100, outputTokens: 30 },
        }),
        persistResult: async () => undefined,
        checkBudget: async () => ({ allowed: true, alertThresholdReached: true }),
        recordCost: async () => undefined,
      },
    );

    expect(result.alert_threshold_reached).toBe(true);
    expect(result.updated).toBe(1);
  });

  it('dryRun=true no llama persistResult ni recordCost', async () => {
    const persistMock = vi.fn().mockResolvedValue(undefined);
    const recordCostMock = vi.fn().mockResolvedValue(undefined);
    const result = await processSentimentBatch(
      { batchSize: 1, dryRun: true },
      {
        nodeEnv: 'production',
        random: () => 1,
        fetchPendingReviews: async () => [mockReview()],
        callModel: async () => ({
          object: {
            sentiment: 0.5,
            confidence: 0.9,
            source_span: 'muy limpio',
            topics: [],
          },
          usage: { inputTokens: 100, outputTokens: 30 },
        }),
        persistResult: persistMock,
        checkBudget: async () => ({ allowed: true, alertThresholdReached: false }),
        recordCost: recordCostMock,
      },
    );

    expect(result.updated).toBe(1);
    expect(persistMock).not.toHaveBeenCalled();
    expect(recordCostMock).not.toHaveBeenCalled();
  });
});
