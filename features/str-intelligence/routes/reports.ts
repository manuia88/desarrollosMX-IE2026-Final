import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const strReportsRouter = router({
  request: authenticatedProcedure
    .input(
      z.object({
        tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        scope: z.object({
          country_code: z.string().length(2),
          market_id: z.string().uuid().optional(),
          listing_id: z.string().min(1).optional(),
          alcaldia_name: z.string().min(1).optional(),
          period_start: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          period_end: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validación tier-specific.
      if (input.tier === 1 && !input.scope.listing_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'tier1_requires_listing_id',
        });
      }
      if (input.tier === 2 && !input.scope.alcaldia_name) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'tier2_requires_alcaldia_name',
        });
      }

      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_reports')
        .insert({
          tier: input.tier,
          customer_id: ctx.user.id,
          scope: input.scope as unknown as never,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select('id, status, requested_at')
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'report_request_failed',
        });
      }
      return {
        id: data.id,
        status: data.status,
        requested_at: data.requested_at,
        eta_seconds: input.tier === 4 ? 5 : 60,
      };
    }),

  list: authenticatedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_reports')
        .select('id, tier, scope, status, pdf_url, requested_at, generated_at, expires_at')
        .eq('customer_id', ctx.user.id)
        .order('requested_at', { ascending: false })
        .limit(input.limit);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  getStatus: authenticatedProcedure
    .input(z.object({ report_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_reports')
        .select('id, tier, status, pdf_url, error_message, generated_at, customer_id')
        .eq('id', input.report_id)
        .maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'report_not_found' });
      }
      // RLS ya filtra customer_id; double-check defensivo.
      if (data.customer_id && data.customer_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return data;
    }),
});
