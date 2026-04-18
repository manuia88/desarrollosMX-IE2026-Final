import { TRPCError } from '@trpc/server';
import { publicProcedure } from './init';

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX_CALLS = 120;

const ADMIN_ROLES: ReadonlySet<string> = new Set(['superadmin', 'mb_admin']);

export const authenticatedProcedure = publicProcedure.use(async ({ ctx, next, path }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const { data: allowed, error } = await ctx.supabase.rpc('check_rate_limit_db', {
    p_user_id: ctx.user.id,
    p_endpoint: path,
    p_window_sec: RATE_LIMIT_WINDOW_SEC,
    p_max_calls: RATE_LIMIT_MAX_CALLS,
  });
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }
  if (!allowed) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      profile: ctx.profile,
    },
  });
});

export const adminProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.profile || !ADMIN_ROLES.has(ctx.profile.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
