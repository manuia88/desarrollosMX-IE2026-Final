import { z } from 'zod';

// Zod schemas para Ghost Zones — SSOT (regla CLAUDE.md).

export const ghostScoreBreakdownSchema = z.object({
  search_component: z.number().min(0).max(100),
  press_component: z.number().min(0).max(100),
  dmx_gap_component: z.number().min(0).max(100),
});

export const hypeLevelSchema = z.enum(['sub_valued', 'aligned', 'over_hyped', 'extreme_hype']);

export const ghostZoneRankingSchema = z.object({
  colonia_id: z.string().uuid(),
  colonia_label: z.string().nullable(),
  country_code: z.string().min(2).max(3),
  period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ghost_score: z.number().min(0).max(100),
  rank: z.number().int().nullable(),
  search_volume: z.number().int().min(0),
  press_mentions: z.number().int().min(0),
  score_total: z.number().nullable(),
  breakdown: ghostScoreBreakdownSchema,
  hype_level: hypeLevelSchema,
  hype_halving_warning: z.boolean(),
  calculated_at: z.string(),
});

export const ghostTimelinePointSchema = z.object({
  period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ghost_score: z.number().min(0).max(100),
  search_volume: z.number().int().min(0),
  press_mentions: z.number().int().min(0),
  breakdown: ghostScoreBreakdownSchema,
});

export const rankingInputSchema = z.object({
  periodDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  topN: z.number().int().min(1).max(200).default(50),
  countryCode: z.string().min(2).max(3).default('MX'),
});

export const timelineInputSchema = z.object({
  coloniaId: z.string().uuid(),
  countryCode: z.string().min(2).max(3).default('MX'),
  months: z.number().int().min(3).max(24).default(12),
});

export type RankingInput = z.infer<typeof rankingInputSchema>;
export type TimelineInput = z.infer<typeof timelineInputSchema>;
export type GhostZoneRankingShape = z.infer<typeof ghostZoneRankingSchema>;
export type GhostTimelinePointShape = z.infer<typeof ghostTimelinePointSchema>;
