import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { MemoryClient } from '@/shared/lib/ai/memory';
import {
  memoryForgetInputSchema,
  memoryRecallInputSchema,
  memoryUpsertInputSchema,
} from '../schemas/memory';

function clientFor(ctx: { supabase: unknown; user: { id: string } }): MemoryClient {
  return new MemoryClient(
    ctx.supabase as ConstructorParameters<typeof MemoryClient>[0],
    ctx.user.id,
  );
}

export const memoryRouter = router({
  upsert: authenticatedProcedure.input(memoryUpsertInputSchema).mutation(async ({ ctx, input }) => {
    const client = clientFor(ctx);
    try {
      const namespace = client.namespace(input.scope, input.scope_id);
      await client.remember(namespace, input.key, input.value, {
        ...(input.importance !== undefined ? { importance: input.importance } : {}),
        ...(input.ttl_seconds !== undefined ? { ttlSeconds: input.ttl_seconds } : {}),
        ...(input.embed !== undefined ? { embed: input.embed } : {}),
      });
      return { ok: true, namespace };
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'memory_upsert_failed',
      });
    }
  }),

  recall: authenticatedProcedure.input(memoryRecallInputSchema).query(async ({ ctx, input }) => {
    const client = clientFor(ctx);
    try {
      const namespace = client.namespace(input.scope, input.scope_id);
      const records = await client.recall(namespace, {
        ...(input.query !== undefined ? { query: input.query } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        ...(input.min_importance !== undefined ? { minImportance: input.min_importance } : {}),
        ...(input.min_similarity !== undefined ? { minSimilarity: input.min_similarity } : {}),
      });
      return records;
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'memory_recall_failed',
      });
    }
  }),

  forget: authenticatedProcedure.input(memoryForgetInputSchema).mutation(async ({ ctx, input }) => {
    const client = clientFor(ctx);
    try {
      const namespace = client.namespace(input.scope, input.scope_id);
      await client.forget(namespace, input.key);
      return { ok: true };
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'memory_forget_failed',
      });
    }
  }),
});
