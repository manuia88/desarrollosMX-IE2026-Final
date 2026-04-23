// Zod schemas for /api/v1/indices/* (ranking + detail endpoints).

import { z } from 'zod';
import { countryCodeSchema, indexCodeSchema, isoYearMonthSchema, scopeTypeSchema } from './common';

export const indicesRankingQuerySchema = z.object({
  scope: scopeTypeSchema.default('colonia'),
  country: countryCodeSchema.default('MX'),
  period: isoYearMonthSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type IndicesRankingQuery = z.infer<typeof indicesRankingQuerySchema>;

export const indicesRankingItemSchema = z.object({
  scope_id: z.string(),
  scope_type: z.string(),
  index_code: z.string(),
  period_date: z.string(),
  value: z.number(),
  ranking_in_scope: z.number().nullable(),
  percentile: z.number().nullable(),
  score_band: z.string().nullable(),
  confidence: z.string(),
  trend_direction: z.string().nullable(),
});
export type IndicesRankingItem = z.infer<typeof indicesRankingItemSchema>;

export const indicesRankingDataSchema = z.object({
  items: z.array(indicesRankingItemSchema),
  period: z.string(),
  index_code: indexCodeSchema,
  scope: scopeTypeSchema,
  country: countryCodeSchema,
  total: z.number().int().min(0),
});
export type IndicesRankingData = z.infer<typeof indicesRankingDataSchema>;

export const indicesDetailQuerySchema = z.object({
  period: isoYearMonthSchema.optional(),
});
export type IndicesDetailQuery = z.infer<typeof indicesDetailQuerySchema>;

export const indicesDetailDataSchema = z.object({
  index_code: indexCodeSchema,
  scope_type: scopeTypeSchema,
  scope_id: z.string(),
  period_date: z.string(),
  value: z.number(),
  ranking_in_scope: z.number().nullable(),
  percentile: z.number().nullable(),
  score_band: z.string().nullable(),
  confidence: z.string(),
  confidence_score: z.number().nullable(),
  trend_direction: z.string().nullable(),
  trend_vs_previous: z.number().nullable(),
  methodology_version: z.string(),
  components: z.unknown(),
});
export type IndicesDetailData = z.infer<typeof indicesDetailDataSchema>;

export const coloniaIndexRowSchema = z.object({
  index_code: z.string(),
  value: z.number(),
  period_date: z.string(),
  confidence: z.string(),
  percentile: z.number().nullable(),
  trend_direction: z.string().nullable(),
  score_band: z.string().nullable(),
});
export type ColoniaIndexRow = z.infer<typeof coloniaIndexRowSchema>;

export const coloniaProfileDataSchema = z.object({
  colonia_id: z.string(),
  country_code: z.string(),
  indices: z.array(coloniaIndexRowSchema),
  pulse_score: z.number().nullable(),
  pulse_period: z.string().nullable(),
  latest_period: z.string().nullable(),
  citations: z.array(
    z.object({
      source: z.string(),
      accessed_at: z.string(),
    }),
  ),
});
export type ColoniaProfileData = z.infer<typeof coloniaProfileDataSchema>;

export const similarSharedVibeTagSchema = z.object({
  vibe_tag_id: z.string(),
  weight_self: z.number().min(0).max(100),
  weight_other: z.number().min(0).max(100),
});

export const similarTopDmxSchema = z.object({
  code: z.string(),
  value: z.number(),
});

export const similarColoniaItemSchema = z.object({
  colonia_id: z.string(),
  similarity: z.number(),
  // Campos enriquecidos (BLOQUE 11.M). Todos opcionales → backward-compatible.
  colonia_label: z.string().nullable().optional(),
  distance: z.number().optional(),
  top_shared_vibe_tags: z.array(similarSharedVibeTagSchema).optional(),
  top_dmx_indices: z.array(similarTopDmxSchema).optional(),
});
export type SimilarColoniaItem = z.infer<typeof similarColoniaItemSchema>;

export const similarColoniaDataSchema = z.object({
  items: z.array(similarColoniaItemSchema),
  source_colonia_id: z.string(),
  note: z.string().optional(),
});
export type SimilarColoniaData = z.infer<typeof similarColoniaDataSchema>;
