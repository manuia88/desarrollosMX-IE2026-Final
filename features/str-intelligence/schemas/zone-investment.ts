import { z } from 'zod';

export const zoneInvestmentGetInput = z.object({
  market_id: z.string().uuid(),
  num_months: z.number().int().min(1).max(60).default(12),
  sentiment_lookback_days: z.number().int().min(30).max(730).default(365),
});

export type ZoneInvestmentGetInput = z.infer<typeof zoneInvestmentGetInput>;

export const sentimentBatchInput = z.object({
  batch_size: z.number().int().min(1).max(500).default(50),
  dry_run: z.boolean().default(false),
});

export type SentimentBatchInput = z.infer<typeof sentimentBatchInput>;

export const sentimentBatchOutput = z.object({
  processed: z.number().int(),
  updated: z.number().int(),
  rejected_low_confidence: z.number().int(),
  rejected_no_text: z.number().int(),
  skipped_sampler: z.number().int(),
  cost_usd_estimated: z.number(),
  cost_usd_actual: z.number(),
  stopped_reason: z.enum(['budget_exceeded', 'no_pending_reviews', 'batch_completed']).optional(),
  alert_threshold_reached: z.boolean(),
});

export type SentimentBatchOutput = z.infer<typeof sentimentBatchOutput>;

export const zisConfidenceEnum = z.enum(['high', 'medium', 'low', 'insufficient_data']);

export const zoneInvestmentOutput = z.object({
  market_id: z.string().uuid(),
  score_code: z.literal('ZIS'),
  score: z.number().min(0).max(100),
  confidence: zisConfidenceEnum,
  components: z.object({
    baseline: z.number(),
    cap_rate: z.number(),
    ltr_regime: z.number(),
    sentiment: z.number(),
    momentum: z.number(),
  }),
  weights_applied: z.object({
    baseline: z.number(),
    cap_rate: z.number(),
    ltr_regime: z.number(),
    sentiment: z.number(),
    momentum: z.number(),
  }),
  inputs_present: z.object({
    baseline: z.boolean(),
    cap_rate: z.boolean(),
    ltr_regime: z.boolean(),
    sentiment: z.boolean(),
    momentum: z.boolean(),
  }),
  contributors_count: z.number().int().min(0).max(5),
  reviews_analyzed: z.number().int().min(0),
});

export type ZoneInvestmentOutput = z.infer<typeof zoneInvestmentOutput>;
