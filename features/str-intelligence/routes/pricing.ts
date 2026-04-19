import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { type CalendarEvent, computeDynamicPricing } from '../lib/pricing/dynamic-advisor';

export const strPricingRouter = router({
  suggest: authenticatedProcedure
    .input(
      z.object({
        market_id: z.string().uuid(),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        forecast_days: z.number().int().min(1).max(365).default(90),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      const { data: marketRow, error: marketErr } = await supabase
        .from('str_markets')
        .select('id, country_code, native_currency')
        .eq('id', input.market_id)
        .maybeSingle();
      if (marketErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: marketErr.message });
      }
      if (!marketRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'market_not_found' });
      }

      // Base ADR + occupancy de los aggregates más recientes (rolling 6m).
      const { data: aggregates } = await supabase
        .from('str_market_monthly_aggregates')
        .select('adr_minor, occupancy_rate')
        .eq('market_id', input.market_id)
        .order('period', { ascending: false })
        .limit(6);

      const adrValues = (aggregates ?? [])
        .map((r) => r.adr_minor)
        .filter((v): v is number => v != null && Number.isFinite(v));
      const occValues = (aggregates ?? [])
        .map((r) => r.occupancy_rate)
        .filter((v): v is number => v != null && Number.isFinite(v));

      const baseAdr = adrValues.length
        ? Math.round(adrValues.reduce((a, b) => a + b, 0) / adrValues.length)
        : 0;
      const baseOccupancy = occValues.length
        ? occValues.reduce((a, b) => a + b, 0) / occValues.length
        : 0;

      if (baseAdr === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'no_baseline_adr_for_market_yet',
        });
      }

      // Eventos: rango = start_date a start_date + forecast_days + 7 días buffer.
      const endDate = new Date(input.start_date);
      endDate.setDate(endDate.getDate() + input.forecast_days + 7);
      const endDateIso = endDate.toISOString().slice(0, 10);

      const { data: eventsRows } = await supabase
        .from('str_events_calendar')
        .select('event_name, date_from, date_to, impact_multiplier, market_id, country_code')
        .eq('country_code', marketRow.country_code)
        .lte('date_from', endDateIso)
        .gte('date_to', input.start_date);

      const events: CalendarEvent[] = (eventsRows ?? [])
        .filter((row) => row.market_id === input.market_id || row.market_id == null)
        .map((row) => ({
          event_name: row.event_name,
          date_from: row.date_from,
          date_to: row.date_to,
          impact_multiplier: Number(row.impact_multiplier),
        }));

      const result = computeDynamicPricing({
        base_adr_minor: baseAdr,
        base_occupancy_rate: baseOccupancy,
        currency: marketRow.native_currency,
        start_date: input.start_date,
        forecast_days: input.forecast_days,
        events,
      });

      return {
        market_id: input.market_id,
        ...result,
      };
    }),

  setOverride: authenticatedProcedure
    .input(
      z.object({
        platform: z.enum(['airbnb', 'vrbo', 'booking']),
        listing_id: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        override_price_minor: z.number().int().min(0),
        currency: z.string().length(3),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { error } = await supabase.from('str_pricing_overrides').upsert(
        {
          platform: input.platform,
          listing_id: input.listing_id,
          date: input.date,
          override_price_minor: input.override_price_minor,
          currency: input.currency,
          reason: input.reason ?? null,
          created_by: ctx.user.id,
        },
        { onConflict: 'platform,listing_id,date' },
      );
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),

  getOverrides: authenticatedProcedure
    .input(
      z.object({
        platform: z.enum(['airbnb', 'vrbo', 'booking']),
        listing_id: z.string().min(1),
        from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_pricing_overrides')
        .select('id, date, override_price_minor, currency, reason, created_by, created_at')
        .eq('platform', input.platform)
        .eq('listing_id', input.listing_id)
        .gte('date', input.from_date)
        .lte('date', input.to_date)
        .order('date', { ascending: true });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),
});
