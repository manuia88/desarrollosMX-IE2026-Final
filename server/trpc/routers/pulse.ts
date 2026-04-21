import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { getPulseHistoryInput, getPulseScoreInput } from '@/features/pulse-score/schemas/pulse';
import type { PulseHistoryPoint, PulseScoreRow } from '@/features/pulse-score/types';
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
const READ_MAX_CALLS = 30;

function resolveIpKey(headers: Headers | undefined, endpoint: string): RateLimitKey {
  if (!headers) return globalKey(endpoint);
  const pseudoRequest = { headers } as unknown as Request;
  const ip = getClientIp(pseudoRequest);
  if (ip === 'unknown') return globalKey(endpoint);
  return ipKey(pseudoRequest);
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export const pulseRouter = router({
  getPulseScore: publicProcedure.input(getPulseScoreInput).query(async ({ input, ctx }) => {
    const endpoint = 'pulse.getPulseScore';
    const key = resolveIpKey(ctx.headers, endpoint);
    const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      let query = client
        .from('zone_pulse_scores' as never)
        .select('*')
        .eq('scope_type', input.scopeType)
        .eq('scope_id', input.scopeId)
        .eq('country_code', input.country);

      if (input.periodDate !== undefined) {
        query = query.eq('period_date', input.periodDate);
      } else {
        query = query.lt('period_date', startOfCurrentMonthIso());
      }

      const { data, error } = await query
        .order('period_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return (data as PulseScoreRow | null) ?? null;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'pulse_fetch_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),

  getPulseHistory: publicProcedure.input(getPulseHistoryInput).query(async ({ input, ctx }) => {
    const endpoint = 'pulse.getPulseHistory';
    const key = resolveIpKey(ctx.headers, endpoint);
    const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      const { data, error } = await client
        .from('zone_pulse_scores' as never)
        .select('period_date, pulse_score, confidence')
        .eq('scope_type', input.scopeType)
        .eq('scope_id', input.scopeId)
        .eq('country_code', input.country)
        .order('period_date', { ascending: false })
        .limit(input.months);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      const rows = (data as ReadonlyArray<PulseHistoryPoint> | null) ?? [];
      return [...rows].sort((a, b) => (a.period_date < b.period_date ? -1 : 1));
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'pulse_history_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),
});

export type PulseRouter = typeof pulseRouter;
