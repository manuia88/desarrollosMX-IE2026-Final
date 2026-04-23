// Zod schemas for /api/v1/scores/history (Time Machine).
// Query: GET /api/v1/scores/history?scope=colonia&id=<uuid>&indexCode=IPV
//         &from=2023-01&to=2026-03&limit=100&cursor=<opaque>
//
// Response items come from public.dmx_indices filtered by scope + index_code
// and period_date range. Cursor is base64url({period_date,id}) — see
// features/api-v1/lib/cursor.ts.

import { z } from 'zod';
import { countryCodeSchema, indexCodeSchema, isoYearMonthSchema, scopeTypeSchema } from './common';

export const historyQuerySchema = z.object({
  scope: scopeTypeSchema,
  id: z.string().min(1).max(128),
  indexCode: indexCodeSchema,
  country: countryCodeSchema.optional(),
  from: isoYearMonthSchema.optional(),
  to: isoYearMonthSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().min(1).max(512).nullable().default(null),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const historyItemSchema = z.object({
  id: z.string().uuid(),
  period_date: z.string(),
  period_type: z.string(),
  value: z.number(),
  confidence: z.string(),
  confidence_score: z.number().nullable(),
  percentile: z.number().nullable(),
  ranking_in_scope: z.number().nullable(),
  score_band: z.string().nullable(),
  trend_direction: z.string().nullable(),
  trend_vs_previous: z.number().nullable(),
  methodology_version: z.string(),
});
export type HistoryItem = z.infer<typeof historyItemSchema>;

export const historyDataSchema = z.object({
  items: z.array(historyItemSchema),
  next_cursor: z.string().nullable(),
  scope: scopeTypeSchema,
  scope_id: z.string(),
  index_code: indexCodeSchema,
});
export type HistoryData = z.infer<typeof historyDataSchema>;
