import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import {
  roleRequestIdSchema,
  roleRequestRejectSchema,
  roleRequestSubmitSchema,
} from '../schemas/role-request';

export const roleRequestRouter = router({
  submit: authenticatedProcedure.input(roleRequestSubmitSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.profile) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    const { data, error } = await ctx.supabase
      .from('role_requests')
      .insert({
        profile_id: ctx.profile.id,
        country_code: ctx.profile.country_code,
        requested_role: input.requested_role,
        reason: input.reason ?? null,
        meta: (input.meta ?? {}) as never,
      })
      .select()
      .single();
    if (error) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
    }
    return data;
  }),

  listPending: authenticatedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('role_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data;
  }),

  approve: authenticatedProcedure.input(roleRequestIdSchema).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.rpc('approve_role_request', {
      p_request_id: input.request_id,
    });
    if (error) {
      throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
    }
    return { ok: true };
  }),

  reject: authenticatedProcedure.input(roleRequestRejectSchema).mutation(async ({ ctx, input }) => {
    const args = input.reason
      ? { p_request_id: input.request_id, p_reason: input.reason }
      : { p_request_id: input.request_id };
    const { error } = await ctx.supabase.rpc('reject_role_request', args);
    if (error) {
      throw new TRPCError({ code: 'FORBIDDEN', message: error.message });
    }
    return { ok: true };
  }),
});
