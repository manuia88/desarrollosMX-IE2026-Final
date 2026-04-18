import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { isLocale } from '@/shared/lib/i18n/config';

const localeSchema = z.string().refine((value) => isLocale(value), 'unsupported locale');
const currencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'ISO 4217 currency code');
const timezoneSchema = z.string().min(1).max(64);

export const meRouter = router({
  profile: authenticatedProcedure.query(async ({ ctx }) => {
    if (!ctx.profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'profile not found' });
    }
    return {
      id: ctx.profile.id,
      email: ctx.profile.email,
      first_name: ctx.profile.first_name,
      last_name: ctx.profile.last_name,
      rol: ctx.profile.rol,
      country_code: ctx.profile.country_code,
      preferred_locale: ctx.profile.preferred_locale,
      preferred_currency: ctx.profile.preferred_currency,
      preferred_timezone: ctx.profile.preferred_timezone,
    };
  }),
  updatePreferredLocale: authenticatedProcedure
    .input(z.object({ locale: localeSchema }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('profiles')
        .update({ preferred_locale: input.locale })
        .eq('id', ctx.user.id);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { preferred_locale: input.locale };
    }),
  updatePreferredCurrency: authenticatedProcedure
    .input(z.object({ currency: currencySchema }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('profiles')
        .update({ preferred_currency: input.currency })
        .eq('id', ctx.user.id);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { preferred_currency: input.currency };
    }),
  updatePreferredTimezone: authenticatedProcedure
    .input(z.object({ timezone: timezoneSchema }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('profiles')
        .update({ preferred_timezone: input.timezone })
        .eq('id', ctx.user.id);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { preferred_timezone: input.timezone };
    }),
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
