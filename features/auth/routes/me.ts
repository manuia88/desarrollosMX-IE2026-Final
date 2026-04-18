import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

export const meRouter = router({
  features: router({
    list: authenticatedProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase.rpc('resolve_features');
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return (data ?? []) as string[];
    }),
  }),
});
