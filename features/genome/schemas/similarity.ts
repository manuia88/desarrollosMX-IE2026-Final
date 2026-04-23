import { z } from 'zod';
import { VIBE_TAG_IDS } from '../types';

export const vibeTagIdSchema = z.enum(VIBE_TAG_IDS);

export const sharedVibeTagSchema = z.object({
  vibe_tag_id: vibeTagIdSchema,
  weight_self: z.number().min(0).max(100),
  weight_other: z.number().min(0).max(100),
});

export const topDmxIndexSchema = z.object({
  code: z.string(),
  value: z.number().min(0).max(100),
});

export const similarityResultSchema = z.object({
  colonia_id: z.string().uuid(),
  colonia_label: z.string().nullable(),
  similarity: z.number().min(-1).max(1),
  distance: z.number().min(0),
  top_shared_vibe_tags: z.array(sharedVibeTagSchema),
  top_dmx_indices: z.array(topDmxIndexSchema),
});

export const findSimilarInputSchema = z.object({
  coloniaId: z.string().uuid(),
  topN: z.number().int().min(1).max(50).default(10),
  minSimilarity: z.number().min(0).max(1).default(0.7),
  minDmxLiv: z.number().min(0).max(100).nullable().default(null),
});

export type FindSimilarInput = z.infer<typeof findSimilarInputSchema>;
export type SimilarityResultShape = z.infer<typeof similarityResultSchema>;
