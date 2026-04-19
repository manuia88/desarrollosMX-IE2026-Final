import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { adminProcedure } from '@/server/trpc/middleware';
import { processPhotoCvBatch } from '../lib/photos/photo-cv-worker';

export const photoCvRouter = router({
  runBatch: adminProcedure
    .input(
      z.object({
        batch_size: z.number().int().min(1).max(200).default(20),
        sample_pct_per_listing: z.number().min(0.05).max(1).default(0.2),
        dry_run: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await processPhotoCvBatch({
          batchSize: input.batch_size,
          samplePctPerListing: input.sample_pct_per_listing,
          dryRun: input.dry_run,
        });
        return result;
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'photo_cv_batch_failed',
        });
      }
    }),
});
