import { z } from 'zod';

export const memoryScopeSchema = z.enum(['user', 'project', 'session']);

export const memoryUpsertInputSchema = z.object({
  scope: memoryScopeSchema,
  scope_id: z.string().uuid().optional(),
  key: z.string().min(1).max(200),
  value: z.unknown(),
  importance: z.number().min(0).max(1).optional(),
  ttl_seconds: z.number().int().positive().optional(),
  embed: z.boolean().optional(),
});

export const memoryRecallInputSchema = z.object({
  scope: memoryScopeSchema,
  scope_id: z.string().uuid().optional(),
  query: z.string().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  min_similarity: z.number().min(0).max(1).optional(),
});

export const memoryForgetInputSchema = z.object({
  scope: memoryScopeSchema,
  scope_id: z.string().uuid().optional(),
  key: z.string().min(1).max(200),
});

export type MemoryUpsertInput = z.infer<typeof memoryUpsertInputSchema>;
export type MemoryRecallInput = z.infer<typeof memoryRecallInputSchema>;
export type MemoryForgetInput = z.infer<typeof memoryForgetInputSchema>;
