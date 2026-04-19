import { z } from 'zod';

// Single Source of Truth per regla #1 CLAUDE.md: el schema deriva type +
// input tRPC + validación forms.

export const strScoresGetBaselineInput = z.object({
  market_id: z.string().uuid().optional(),
  // Alternativa a market_id: identifier AirROI (útil cuando el caller solo
  // tiene coordenadas o sub-colonia sin resolver str_markets.id todavía).
  airroi: z
    .object({
      country: z.string().min(1),
      region: z.string().min(1),
      locality: z.string().min(1),
      district: z.string().optional(),
    })
    .optional(),
  num_months: z.number().int().min(1).max(60).default(12),
});

export type StrScoresGetBaselineInput = z.infer<typeof strScoresGetBaselineInput>;

export const strScoresGetZoneStatsInput = z.object({
  market_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type StrScoresGetZoneStatsInput = z.infer<typeof strScoresGetZoneStatsInput>;

export const strScoresBaselineOutput = z.object({
  market_id: z.string().uuid(),
  score_code: z.literal('STR-BASELINE'),
  score: z.number().min(0).max(100),
  confidence: z.enum(['high', 'medium', 'low', 'insufficient_data']),
  components: z.object({
    occupancy: z.number(),
    revpar: z.number(),
    volatility: z.number(),
    sample: z.number(),
  }),
  metrics: z.object({
    periods_available: z.number().int(),
    occupancy_avg: z.number().nullable(),
    occupancy_cv: z.number().nullable(),
    revpar_avg_minor: z.number().nullable(),
    benchmark_ratio_occupancy: z.number().nullable(),
    benchmark_ratio_revpar: z.number().nullable(),
  }),
});

export type StrScoresBaselineOutput = z.infer<typeof strScoresBaselineOutput>;
