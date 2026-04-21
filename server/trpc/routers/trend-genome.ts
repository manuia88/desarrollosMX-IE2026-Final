import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import {
  getAlphaAccuracyInput,
  getAlphaCountInput,
  getAlphaZoneDetailInput,
  getAlphaZonesInput,
  subscribeToAlphaAlertsInput,
} from '@/features/trend-genome/schemas/alpha';
import type {
  AlphaCountTeaser,
  AlphaGenomeComponents,
  AlphaScopeType,
  AlphaTier,
  AlphaZonePublicRow,
} from '@/features/trend-genome/types';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import {
  checkRateLimit,
  getClientIp,
  globalKey,
  ipKey,
  type RateLimitKey,
} from '@/shared/lib/security/rate-limit';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const READ_WINDOW_SEC = 3600;
const READ_MAX_CALLS = 30;

const ADMIN_ROLES: ReadonlySet<string> = new Set(['superadmin', 'mb_admin']);
const DEFAULT_SUB_THRESHOLD_PCT = 25;

function resolveIpKey(headers: Headers | undefined, endpoint: string): RateLimitKey {
  if (!headers) return globalKey(endpoint);
  const pseudoRequest = { headers } as unknown as Request;
  const ip = getClientIp(pseudoRequest);
  if (ip === 'unknown') return globalKey(endpoint);
  return ipKey(pseudoRequest);
}

// ---------------- Pro+ gating ----------------
//
// Pro+ = superadmin / mb_admin OR user with an active subscription
// (subject_type='profile', status='active').
const proTierProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  const rol = ctx.profile?.rol;
  if (rol && ADMIN_ROLES.has(rol)) {
    return next({ ctx });
  }

  const client = ctx.supabase as unknown as SupabaseClient<Record<string, unknown>>;
  const { data, error } = await client
    .from('subscriptions' as never)
    .select('id, status')
    .eq('subject_type', 'profile')
    .eq('subject_id', ctx.user.id)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }
  const rows = (data as ReadonlyArray<{ id: string; status: string }> | null) ?? [];
  if (rows.length === 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'pro_tier_required' });
  }
  return next({ ctx });
});

// ---------------- Row mappers ----------------

interface AlphaAlertDbRow {
  readonly zone_id: string;
  readonly scope_type: AlphaScopeType;
  readonly country_code: string;
  readonly alpha_score: number | string;
  readonly time_to_mainstream_months: number | null;
  readonly signals: Record<string, unknown> | null;
  readonly detected_at: string;
  readonly is_active: boolean;
}

function parseGenomeComponents(signals: Record<string, unknown> | null): AlphaGenomeComponents {
  const s = (signals ?? {}) as Partial<AlphaGenomeComponents> & Record<string, unknown>;
  return s as AlphaGenomeComponents;
}

function inferTierFromComponents(components: AlphaGenomeComponents): AlphaTier {
  if (components.tier) return components.tier;
  return 'speculative';
}

function inferNeedsReview(signals: Record<string, unknown> | null): boolean {
  if (!signals) return false;
  const v = signals.needs_review;
  return v === true;
}

function mapAlphaRowToPublic(row: AlphaAlertDbRow): AlphaZonePublicRow {
  const components = parseGenomeComponents(row.signals);
  return {
    zone_id: row.zone_id,
    scope_type: row.scope_type,
    country_code: row.country_code,
    alpha_score: typeof row.alpha_score === 'string' ? Number(row.alpha_score) : row.alpha_score,
    time_to_mainstream_months: row.time_to_mainstream_months,
    tier: inferTierFromComponents(components),
    detected_at: row.detected_at,
    signals_breakdown: components,
    needs_review: inferNeedsReview(row.signals),
  };
}

// ---------------- Router ----------------

export const trendGenomeRouter = router({
  // ---------- PROTECTED: list alpha zones ----------
  getAlphaZones: proTierProcedure.input(getAlphaZonesInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      let query = client
        .from('zone_alpha_alerts' as never)
        .select(
          'zone_id, scope_type, country_code, alpha_score, time_to_mainstream_months, signals, detected_at, is_active',
        )
        .eq('country_code', input.country)
        .eq('scope_type', input.scopeType)
        .eq('is_active', true);

      if (input.minScore !== undefined) {
        query = query.gte('alpha_score', input.minScore);
      }

      const { data, error } = await query
        .order('alpha_score', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      const rows = (data as ReadonlyArray<AlphaAlertDbRow> | null) ?? [];
      const mapped = rows.map(mapAlphaRowToPublic);
      if (input.tier !== undefined) {
        return mapped.filter((r) => r.tier === input.tier);
      }
      return mapped;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'alpha_zones_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),

  // ---------- PROTECTED: zone detail ----------
  getAlphaZoneDetail: proTierProcedure
    .input(getAlphaZoneDetailInput)
    .query(async ({ input }): Promise<AlphaZonePublicRow> => {
      const supabase = createAdminClient();
      const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

      try {
        const { data, error } = await client
          .from('zone_alpha_alerts' as never)
          .select(
            'zone_id, scope_type, country_code, alpha_score, time_to_mainstream_months, signals, detected_at, is_active',
          )
          .eq('country_code', input.country)
          .eq('zone_id', input.zoneId)
          .eq('is_active', true)
          .order('detected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        if (!data) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'alpha_zone_not_found' });
        }

        return mapAlphaRowToPublic(data as AlphaAlertDbRow);
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const msg = err instanceof Error ? err.message : 'alpha_zone_detail_failed';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
      }
    }),

  // ---------- PROTECTED: subscribe to alerts ----------
  subscribeToAlphaAlerts: proTierProcedure
    .input(subscribeToAlphaAlertsInput)
    .mutation(async ({ input, ctx }) => {
      const client = ctx.supabase as unknown as SupabaseClient<Record<string, unknown>>;

      try {
        const insertRow: Record<string, unknown> = {
          user_id: ctx.user.id,
          zone_id: input.zoneId,
          country_code: input.country,
          channel: input.channel,
          threshold_pct: DEFAULT_SUB_THRESHOLD_PCT,
          active: true,
        };

        const { error } = await client
          .from('zone_alert_subscriptions' as never)
          .insert(insertRow as never);

        if (error) {
          const code = (error as { code?: string }).code;
          const message =
            typeof (error as { message?: string }).message === 'string'
              ? (error as { message?: string }).message
              : '';
          const msg = message ?? '';
          if (code === '42P01' || /does not exist|not.*found/i.test(msg)) {
            return { subscribed: false, reason: 'TABLE_NOT_FOUND' as const };
          }
          // Unique violation — treat as already subscribed (idempotent).
          if (code === '23505' || /duplicate key|unique/i.test(msg)) {
            return {
              subscribed: true as const,
              zoneId: input.zoneId,
              channel: input.channel,
            };
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: msg || 'subscribe_failed',
          });
        }

        return {
          subscribed: true as const,
          zoneId: input.zoneId,
          channel: input.channel,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const msg = err instanceof Error ? err.message : 'subscribe_failed';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
      }
    }),

  // ---------- PUBLIC: alpha count teaser (UPGRADE #9) ----------
  getAlphaCount: publicProcedure
    .input(getAlphaCountInput)
    .query(async ({ input, ctx }): Promise<AlphaCountTeaser> => {
      const endpoint = 'trendGenome.getAlphaCount';
      const key = resolveIpKey(ctx.headers, endpoint);
      const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

      try {
        const { data, error } = await client
          .from('zone_alpha_alerts' as never)
          .select('alpha_score, signals, detected_at')
          .eq('country_code', input.country)
          .eq('is_active', true);

        if (error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }

        const rows =
          (data as ReadonlyArray<{
            readonly alpha_score: number | string;
            readonly signals: Record<string, unknown> | null;
            readonly detected_at: string;
          }> | null) ?? [];

        let confirmed = 0;
        let golden = 0;
        let lastUpdated: string | null = null;
        for (const r of rows) {
          const components = parseGenomeComponents(r.signals);
          const tier = inferTierFromComponents(components);
          if (tier === 'confirmed') confirmed += 1;
          if (tier === 'golden_opportunity') golden += 1;
          if (lastUpdated === null || r.detected_at > lastUpdated) {
            lastUpdated = r.detected_at;
          }
        }

        return {
          country_code: input.country,
          total_alpha_zones: rows.length,
          confirmed_count: confirmed,
          golden_opportunity_count: golden,
          last_updated_at: lastUpdated,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const msg = err instanceof Error ? err.message : 'alpha_count_failed';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
      }
    }),

  // ---------- PUBLIC: retrocausal backtest accuracy (UPGRADE #2) ----------
  getAlphaAccuracy: publicProcedure.input(getAlphaAccuracyInput).query(async ({ input, ctx }) => {
    const endpoint = 'trendGenome.getAlphaAccuracy';
    const key = resolveIpKey(ctx.headers, endpoint);
    const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      const cutoffMs = Date.now() - input.monthsLookback * 30 * 24 * 60 * 60 * 1000;
      const cutoffIso = new Date(cutoffMs).toISOString();

      const { data, error } = await client
        .from('zone_alpha_alerts' as never)
        .select('zone_id, detected_at')
        .eq('country_code', input.country)
        .lt('detected_at', cutoffIso);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      const rows = (data as ReadonlyArray<{ zone_id: string; detected_at: string }> | null) ?? [];
      const historicalCount = rows.length;

      if (historicalCount === 0) {
        return {
          country: input.country,
          monthsLookback: input.monthsLookback,
          historical_count: 0,
          realized_count: 0,
          accuracy_pct: null,
          note: 'insufficient_backtest_data_h1',
        };
      }

      // H1: realized validation pipeline lives in FASE 12+. For now we surface
      // the historical count without claiming realized accuracy.
      return {
        country: input.country,
        monthsLookback: input.monthsLookback,
        historical_count: historicalCount,
        realized_count: 0,
        accuracy_pct: null,
        note: 'insufficient_backtest_data_h1',
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'alpha_accuracy_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),
});

export type TrendGenomeRouter = typeof trendGenomeRouter;
