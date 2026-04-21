import { z } from 'zod';

// Zod schemas para Scorecard Nacional (BLOQUE 11.I). Single Source of Truth
// para tRPC inputs + Supabase row parsing + form validation.

export const scorecardCountryCodeSchema = z.string().length(2).default('MX');
export const scorecardIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const scorecardPeriodTypeSchema = z.enum(['monthly', 'quarterly', 'annual']);

export const scorecardReportIdSchema = z
  .string()
  .regex(/^[A-Z]{2}-\d{4}-(Q[1-4]|M\d{2}|A)$/, 'expected format XX-YYYY-QN|MNN|A');

export const alphaLifecycleStateSchema = z.enum([
  'emerging',
  'alpha',
  'peaked',
  'matured',
  'declining',
]);

export const magnetExodusTierSchema = z.enum(['magnet', 'exodus', 'neutral']);

export const heroInsightKindSchema = z.enum([
  'pulse_national',
  'top_magnet',
  'top_exodus',
  'alpha_emerging',
  'sustainability_leader',
  'ipv_mover',
]);

// ---------------- tRPC inputs ----------------

export const getScorecardInput = z.object({
  reportId: scorecardReportIdSchema,
});
export type GetScorecardInput = z.infer<typeof getScorecardInput>;

export const getScorecardArchiveInput = z.object({
  country: scorecardCountryCodeSchema,
  limit: z.number().int().min(1).max(50).default(12),
});
export type GetScorecardArchiveInput = z.infer<typeof getScorecardArchiveInput>;

export const getCausalTimelineInput = z.object({
  zoneId: z.string().min(1).max(128),
  country: scorecardCountryCodeSchema,
  months: z.number().int().min(6).max(36).default(12),
});
export type GetCausalTimelineInput = z.infer<typeof getCausalTimelineInput>;

export const getMagnetExodusInput = z.object({
  country: scorecardCountryCodeSchema,
  periodDate: scorecardIsoDateSchema.optional(),
  limit: z.number().int().min(5).max(50).default(10),
});
export type GetMagnetExodusInput = z.infer<typeof getMagnetExodusInput>;

export const getAlphaLifecycleInput = z.object({
  country: scorecardCountryCodeSchema,
  periodDate: scorecardIsoDateSchema.optional(),
  includeCaseStudies: z.boolean().default(true),
});
export type GetAlphaLifecycleInput = z.infer<typeof getAlphaLifecycleInput>;

export const generateScorecardInput = z.object({
  country: scorecardCountryCodeSchema,
  periodType: scorecardPeriodTypeSchema,
  periodDate: scorecardIsoDateSchema,
  publishImmediately: z.boolean().default(false),
});
export type GenerateScorecardInput = z.infer<typeof generateScorecardInput>;

// ---------------- BD row schemas ----------------

export const scorecardNationalReportRowSchema = z.object({
  id: z.string(),
  report_id: scorecardReportIdSchema,
  period_type: scorecardPeriodTypeSchema,
  period_date: scorecardIsoDateSchema,
  country_code: z.string(),
  pdf_url: z.string().nullable(),
  narrative_md: z.string().nullable(),
  data_snapshot: z.record(z.string(), z.unknown()),
  published_at: z.string().nullable(),
  hero_insights: z.array(z.unknown()),
  press_kit_url: z.string().nullable(),
  created_at: z.string(),
});

// ---------------- Hero insight schema ----------------

export const heroInsightSchema = z.object({
  kind: heroInsightKindSchema,
  zone_id: z.string().nullable(),
  zone_label: z.string(),
  headline: z.string(),
  value: z.number().nullable(),
  delta: z.number().nullable(),
  unit: z.enum(['score_0_100', 'pct', 'count', 'absolute']),
});

// ---------------- Magnet/Exodus row schema ----------------

export const magnetExodusRowSchema = z.object({
  zone_id: z.string(),
  zone_label: z.string(),
  scope_type: z.enum(['colonia', 'alcaldia']),
  country_code: z.string(),
  period_date: scorecardIsoDateSchema,
  inflow: z.number(),
  outflow: z.number(),
  net_flow: z.number(),
  net_flow_pct: z.number(),
  tier: magnetExodusTierSchema,
  rank: z.number().int(),
});

// ---------------- Alpha lifecycle transition schema ----------------

export const alphaLifecycleTransitionSchema = z.object({
  zone_id: z.string(),
  zone_label: z.string(),
  from_state: alphaLifecycleStateSchema.nullable(),
  to_state: alphaLifecycleStateSchema,
  detected_at: z.string(),
  alpha_score_at_transition: z.number().nullable(),
  reason: z.string(),
});

// ---------------- Ranking schema ----------------

export const scorecardRankingEntrySchema = z.object({
  rank: z.number().int(),
  zone_id: z.string(),
  zone_label: z.string(),
  scope_type: z.enum(['colonia', 'alcaldia', 'city', 'estado']),
  value: z.number(),
  delta_vs_previous: z.number().nullable(),
  trend_direction: z.enum(['mejorando', 'estable', 'empeorando']).nullable(),
});
