import { TRPCError } from '@trpc/server';
import { authenticatedProcedure } from './middleware';

export const FEATURE_MAP: Record<string, string> = {};

export const featureProcedure = authenticatedProcedure.use(async ({ ctx, next, path }) => {
  const required = FEATURE_MAP[path];
  if (!required) {
    return next({ ctx });
  }
  const { data, error } = await ctx.supabase.rpc('resolve_features');
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }
  const features = (data ?? []) as string[];
  if (!features.includes(required)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'feature_locked' });
  }
  return next({ ctx });
});
