// DMX Studio dentro DMX único entorno (ADR-054). tRPC subscriptions router.
// STUB ADR-018 — activar L-NEW-STRIPE-SDK-INSTALL: getStripe() retorna mock IDs
// hasta que el SDK real esté instalado.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createStudioCheckoutSession } from '@/features/dmx-studio/lib/stripe/checkout';
import { getStripe } from '@/features/dmx-studio/lib/stripe/client';
import { createPortalSession } from '@/features/dmx-studio/lib/stripe/portal';
import { createStudioCheckoutInput, studioPortalInput } from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';

interface ActiveSubscriptionRow {
  readonly id: string;
  readonly plan_key: string;
  readonly status: string;
  readonly stripe_customer_id: string | null;
  readonly stripe_subscription_id: string | null;
  readonly stripe_price_id: string;
  readonly current_period_start: string | null;
  readonly current_period_end: string | null;
  readonly cancel_at_period_end: boolean;
  readonly videos_per_month_limit: number;
  readonly videos_used_this_period: number;
  readonly founders_cohort: boolean;
  readonly founders_discount_pct: number;
}

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'] as const;

export const studioSubscriptionsRouter = router({
  getActive: authenticatedProcedure.query(
    async ({ ctx }): Promise<ActiveSubscriptionRow | null> => {
      const { data, error } = await ctx.supabase
        .from('studio_subscriptions')
        .select(
          'id, plan_key, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, videos_per_month_limit, videos_used_this_period, founders_cohort, founders_discount_pct',
        )
        .eq('user_id', ctx.user.id)
        .in('status', [...ACTIVE_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
          cause: error,
        });
      }
      return (data as ActiveSubscriptionRow | null) ?? null;
    },
  ),

  getUsage: authenticatedProcedure.query(
    async ({
      ctx,
    }): Promise<{
      videos_per_month_limit: number;
      videos_used_this_period: number;
      founders_cohort: boolean;
      founders_discount_pct: number;
    } | null> => {
      const { data, error } = await ctx.supabase
        .from('studio_subscriptions')
        .select(
          'videos_per_month_limit, videos_used_this_period, founders_cohort, founders_discount_pct',
        )
        .eq('user_id', ctx.user.id)
        .in('status', [...ACTIVE_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
          cause: error,
        });
      }
      return (
        (data as {
          videos_per_month_limit: number;
          videos_used_this_period: number;
          founders_cohort: boolean;
          founders_discount_pct: number;
        } | null) ?? null
      );
    },
  ),

  createCheckout: authenticatedProcedure
    .input(createStudioCheckoutInput)
    .mutation(async ({ ctx, input }): Promise<{ url: string; sessionId: string }> => {
      try {
        const result = await createStudioCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          planKey: input.planKey,
          successUrl: input.successPath,
          cancelUrl: input.cancelPath,
        });
        return { url: result.url, sessionId: result.sessionId };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'checkout_failed';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message, cause: err });
      }
    }),

  getPortalUrl: authenticatedProcedure
    .input(studioPortalInput)
    .mutation(async ({ ctx, input }): Promise<{ url: string }> => {
      const { data, error } = await ctx.supabase
        .from('studio_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', ctx.user.id)
        .not('stripe_customer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
          cause: error,
        });
      }
      const customerId = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
      if (!customerId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'no_stripe_customer_for_user',
        });
      }
      try {
        const result = await createPortalSession({
          customerId,
          returnUrl: input.returnPath,
        });
        return { url: result.url };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'portal_failed';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message, cause: err });
      }
    }),

  cancelSubscription: authenticatedProcedure
    .input(z.object({}).optional())
    .mutation(async ({ ctx }): Promise<{ ok: true; canceledAtPeriodEnd: boolean }> => {
      const { data, error } = await ctx.supabase
        .from('studio_subscriptions')
        .select('id, stripe_subscription_id')
        .eq('user_id', ctx.user.id)
        .in('status', [...ACTIVE_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
          cause: error,
        });
      }
      const row = data as { id: string; stripe_subscription_id: string | null } | null;
      if (!row?.stripe_subscription_id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'no_active_subscription',
        });
      }

      try {
        const stripe = getStripe();
        await stripe.subscriptions.update(row.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'cancel_failed';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message, cause: err });
      }

      const { error: updateError } = await ctx.supabase
        .from('studio_subscriptions')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: updateError.message,
          cause: updateError,
        });
      }
      return { ok: true, canceledAtPeriodEnd: true };
    }),
});
