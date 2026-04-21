// features/newsletter/routes/newsletter-public.ts
//
// BLOQUE 11.J — tRPC router público newsletter. Exponer:
//   - listStreaks:           público, lee zone_streaks top N del período actual
//   - getPreferences:        requiere token (unsubscribe/preferences), lee
//                            newsletter_subscribers.preferences por hash.
//   - subscribeZonePreference: público (email + zona), upsert a subscribers.
//
// NOTA coordinación con A: A expone endpoints REST para /api/newsletter/*.
// Este router cubre paridad tRPC para hooks + SSR — ambos pueden coexistir.

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getStreaksInput,
  newsletterEmailSchema,
  newsletterLocaleSchema,
  newsletterPreferencesSchema,
  updatePreferencesInput,
} from '@/features/newsletter/schemas/newsletter';
import type {
  NewsletterPreferences,
  NewsletterSubscriberRow,
  ZoneStreakRow,
} from '@/features/newsletter/types';
import { publicProcedure, router } from '@/server/trpc/init';
import {
  checkRateLimit,
  getClientIp,
  globalKey,
  ipKey,
  type RateLimitKey,
} from '@/shared/lib/security/rate-limit';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const READ_WINDOW_SEC = 3600;
const READ_MAX_CALLS = 60;
const WRITE_WINDOW_SEC = 3600;
const WRITE_MAX_CALLS = 10;

function resolveIpKey(headers: Headers | undefined, endpoint: string): RateLimitKey {
  if (!headers) return globalKey(endpoint);
  const pseudoRequest = { headers } as unknown as Request;
  const ip = getClientIp(pseudoRequest);
  if (ip === 'unknown') return globalKey(endpoint);
  return ipKey(pseudoRequest);
}

// --- Subscribe via zone ---

const subscribeZonePreferenceInput = z
  .object({
    email: newsletterEmailSchema,
    locale: newsletterLocaleSchema.default('es-MX'),
    sourceScopeId: z.string().min(1).max(128),
    consentLfpdppp: z.boolean().refine((v) => v === true, { message: 'consent_required' }),
  })
  .strict();

// --- Router ---

export const newsletterPublicRouter = router({
  listStreaks: publicProcedure.input(getStreaksInput).query(async ({ input, ctx }) => {
    const endpoint = 'newsletter.listStreaks';
    const key = resolveIpKey(ctx.headers, endpoint);
    const rl = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!rl.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    // Latest period available for this country.
    const { data: latestData, error: latestErr } = await client
      .from('zone_streaks' as never)
      .select('period_date')
      .eq('country_code', input.countryCode)
      .order('period_date', { ascending: false })
      .limit(1);
    if (latestErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: latestErr.message });
    }
    const latestRows = (latestData as ReadonlyArray<{ period_date: string }> | null) ?? [];
    const latest = latestRows[0];
    if (!latest) return { period_date: null, rows: [] as ReadonlyArray<ZoneStreakRow> };

    const { data, error } = await client
      .from('zone_streaks' as never)
      .select(
        'id, country_code, scope_type, scope_id, period_date, streak_length_months, current_pulse, rank_in_country, computed_at',
      )
      .eq('country_code', input.countryCode)
      .eq('period_date', latest.period_date)
      .order('rank_in_country', { ascending: true })
      .limit(input.limit);
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return {
      period_date: latest.period_date,
      rows: (data as ReadonlyArray<ZoneStreakRow> | null) ?? [],
    };
  }),

  getPreferences: publicProcedure
    .input(z.object({ token: z.string().min(20).max(512) }).strict())
    .query(async ({ input, ctx }) => {
      const endpoint = 'newsletter.getPreferences';
      const key = resolveIpKey(ctx.headers, endpoint);
      const rl = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
      if (!rl.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

      const tokenHash = await hashToken(input.token);
      const { data, error } = await client
        .from('newsletter_subscribers' as never)
        .select('id, email, locale, status, preferences')
        .or(`unsubscribe_token_hash.eq.${tokenHash},confirm_token_hash.eq.${tokenHash}`)
        .limit(1);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      const rows =
        (data as ReadonlyArray<
          Pick<NewsletterSubscriberRow, 'id' | 'email' | 'locale' | 'status' | 'preferences'>
        > | null) ?? [];
      const subscriber = rows[0];
      if (!subscriber) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'invalid_token' });
      }
      return {
        id: subscriber.id,
        email: subscriber.email,
        locale: subscriber.locale,
        status: subscriber.status,
        preferences: subscriber.preferences,
      };
    }),

  subscribeZonePreference: publicProcedure
    .input(subscribeZonePreferenceInput)
    .mutation(async ({ input, ctx }) => {
      const endpoint = 'newsletter.subscribeZonePreference';
      const key = resolveIpKey(ctx.headers, endpoint);
      const rl = await checkRateLimit(key, endpoint, WRITE_WINDOW_SEC, WRITE_MAX_CALLS);
      if (!rl.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

      const preferences: NewsletterPreferences = {
        frequency: 'monthly',
        zone_scope_ids: [input.sourceScopeId],
        sections: {
          pulse: true,
          migration: true,
          causal: true,
          alpha: false,
          scorecard: true,
          streaks: true,
        },
      };

      const writer = client as unknown as {
        from: (t: string) => {
          upsert: (
            row: Record<string, unknown>,
            opts: { readonly onConflict: string },
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await writer.from('newsletter_subscribers').upsert(
        {
          email: input.email,
          locale: input.locale,
          status: 'pending_confirmation',
          preferences,
          consent_lfpdppp_at: new Date().toISOString(),
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      );
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),

  updatePreferences: publicProcedure
    .input(updatePreferencesInput)
    .mutation(async ({ input, ctx }) => {
      const endpoint = 'newsletter.updatePreferences';
      const key = resolveIpKey(ctx.headers, endpoint);
      const rl = await checkRateLimit(key, endpoint, WRITE_WINDOW_SEC, WRITE_MAX_CALLS);
      if (!rl.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();

      const tokenHash = await hashToken(input.token);
      const prefs = newsletterPreferencesSchema.parse(input.preferences);

      const updater = supabase as unknown as {
        from: (t: string) => {
          update: (patch: Record<string, unknown>) => {
            or: (filter: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await updater
        .from('newsletter_subscribers')
        .update({ preferences: prefs })
        .or(`unsubscribe_token_hash.eq.${tokenHash},confirm_token_hash.eq.${tokenHash}`);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),
});

// SHA-256 hex hash helper. Web Crypto (works in Node 20+ and Edge).
async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(buf);
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

export type NewsletterPublicRouter = typeof newsletterPublicRouter;
