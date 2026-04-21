import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import {
  getFlowMapInput,
  getFlowsForZoneInput,
  getTopFlowsInput,
} from '@/features/migration-flow/schemas/flow';
import type { MigrationFlowPublicRow } from '@/features/migration-flow/types';
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

export const migrationFlowRouter = router({
  getFlowsForZone: publicProcedure.input(getFlowsForZoneInput).query(async ({ input, ctx }) => {
    const endpoint = 'migrationFlow.getFlowsForZone';
    const key = resolveIpKey(ctx.headers, endpoint);
    const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      let query = client
        .from('zone_migration_flows' as never)
        .select(
          'origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, country_code, period_date, volume, confidence, source_mix, income_decile_origin, income_decile_dest',
        )
        .eq('country_code', input.country);

      if (input.direction === 'inflow') {
        query = query.eq('dest_scope_type', input.scopeType).eq('dest_scope_id', input.zoneId);
      } else {
        query = query.eq('origin_scope_type', input.scopeType).eq('origin_scope_id', input.zoneId);
      }

      if (input.periodDate !== undefined) {
        query = query.eq('period_date', input.periodDate);
      } else {
        query = query.lt('period_date', startOfCurrentMonthIso());
      }

      const { data, error } = await query.order('volume', { ascending: false }).limit(input.limit);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return (data as ReadonlyArray<MigrationFlowPublicRow> | null) ?? [];
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'migration_flows_zone_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),

  getTopFlows: publicProcedure.input(getTopFlowsInput).query(async ({ input, ctx }) => {
    const endpoint = 'migrationFlow.getTopFlows';
    const key = resolveIpKey(ctx.headers, endpoint);
    const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      let query = client
        .from('zone_migration_flows' as never)
        .select(
          'origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, country_code, period_date, volume, confidence, source_mix, income_decile_origin, income_decile_dest',
        )
        .eq('country_code', input.country)
        .eq('origin_scope_type', input.scopeType)
        .eq('dest_scope_type', input.scopeType);

      if (input.periodDate !== undefined) {
        query = query.eq('period_date', input.periodDate);
      } else {
        query = query.lt('period_date', startOfCurrentMonthIso());
      }

      if (input.incomeDecileMin !== undefined) {
        query = query
          .gte('income_decile_origin', input.incomeDecileMin)
          .gte('income_decile_dest', input.incomeDecileMin);
      }
      if (input.incomeDecileMax !== undefined) {
        query = query
          .lte('income_decile_origin', input.incomeDecileMax)
          .lte('income_decile_dest', input.incomeDecileMax);
      }

      const { data, error } = await query.order('volume', { ascending: false }).limit(input.limit);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return (data as ReadonlyArray<MigrationFlowPublicRow> | null) ?? [];
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'migration_top_flows_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),

  getFlowMap: publicProcedure.input(getFlowMapInput).query(async ({ input, ctx }) => {
    const endpoint = 'migrationFlow.getFlowMap';
    const key = resolveIpKey(ctx.headers, endpoint);
    const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
    if (!limit.allowed) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
    }

    const supabase = createAdminClient();
    const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

    try {
      let query = client
        .from('zone_migration_flows' as never)
        .select(
          'origin_scope_type, origin_scope_id, dest_scope_type, dest_scope_id, country_code, period_date, volume, confidence, source_mix, income_decile_origin, income_decile_dest',
        )
        .eq('country_code', input.country)
        .eq('origin_scope_type', input.scopeType)
        .eq('dest_scope_type', input.scopeType);

      if (input.periodDate !== undefined) {
        query = query.eq('period_date', input.periodDate);
      } else {
        query = query.lt('period_date', startOfCurrentMonthIso());
      }

      if (input.incomeDecileMin !== undefined) {
        query = query
          .gte('income_decile_origin', input.incomeDecileMin)
          .gte('income_decile_dest', input.incomeDecileMin);
      }
      if (input.incomeDecileMax !== undefined) {
        query = query
          .lte('income_decile_origin', input.incomeDecileMax)
          .lte('income_decile_dest', input.incomeDecileMax);
      }

      const { data, error } = await query.order('volume', { ascending: false }).limit(input.limit);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return (data as ReadonlyArray<MigrationFlowPublicRow> | null) ?? [];
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : 'migration_flow_map_failed';
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
    }
  }),
});

export type MigrationFlowRouter = typeof migrationFlowRouter;
