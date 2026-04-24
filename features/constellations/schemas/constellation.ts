import { z } from 'zod';
import { EDGE_TYPES } from '../types';

// Zod schemas para Zone Constellations — SSOT.

const percent = z.number().min(0).max(100);

export const edgeTypeBreakdownSchema = z.object({
  migration: percent,
  climate_twin: percent,
  genoma_similarity: percent,
  pulse_correlation: percent,
});

export const constellationEdgeSchema = z.object({
  source_colonia_id: z.string().uuid(),
  target_colonia_id: z.string().uuid(),
  target_label: z.string().nullable(),
  edge_weight: percent,
  edge_types: edgeTypeBreakdownSchema,
  period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getEdgesInputSchema = z.object({
  coloniaId: z.string().uuid(),
  periodDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  minWeight: z.number().min(0).max(100).default(30),
  limit: z.number().int().min(5).max(200).default(50),
  countryCode: z.string().min(2).max(3).default('MX'),
});

export const getClustersInputSchema = z.object({
  periodDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limitPerCluster: z.number().int().min(1).max(100).default(20),
  countryCode: z.string().min(2).max(3).default('MX'),
});

export const findPathInputSchema = z.object({
  sourceColoniaId: z.string().uuid(),
  targetColoniaId: z.string().uuid(),
  maxHops: z.number().int().min(1).max(8).default(5),
  periodDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  countryCode: z.string().min(2).max(3).default('MX'),
});

export const getContagionPathsInputSchema = z.object({
  topN: z.number().int().min(1).max(50).default(5),
  periodDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  countryCode: z.string().min(2).max(3).default('MX'),
});

export const edgeTypeKeySchema = z.enum(EDGE_TYPES);

export type GetEdgesInput = z.infer<typeof getEdgesInputSchema>;
export type GetClustersInput = z.infer<typeof getClustersInputSchema>;
export type FindPathInput = z.infer<typeof findPathInputSchema>;
export type GetContagionPathsInput = z.infer<typeof getContagionPathsInputSchema>;
