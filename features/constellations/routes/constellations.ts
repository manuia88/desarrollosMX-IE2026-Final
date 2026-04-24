// BLOQUE 11.R.2 + 11.R.4 — Zone Constellations tRPC router (public).
//
// Endpoints:
//   - getEdges({coloniaId, periodDate?, minWeight, limit, countryCode})
//       → ConstellationEdge[] con target labels + edge_types breakdown.
//   - getClusters({periodDate?, limitPerCluster, countryCode})
//       → ConstellationCluster[] con members + labels.
//   - findPath({sourceColoniaId, targetColoniaId, maxHops, ...})
//       → PathResult BFS in-memory.
//   - getContagionPaths({topN, periodDate?, countryCode})  (U13)
//       → ContagionPath[] ghost→real on-demand.
//
// Rate limit per-endpoint vía checkRateLimit (reuso 11.L).

import { TRPCError } from '@trpc/server';
import {
  findPathInputSchema,
  getClustersInputSchema,
  getContagionPathsInputSchema,
  getEdgesInputSchema,
} from '@/features/constellations/schemas/constellation';
import type {
  ConstellationCluster,
  ConstellationEdge,
  ContagionPath,
  PathResult,
} from '@/features/constellations/types';
import { publicProcedure, router } from '@/server/trpc/init';
import { rowToConstellationEdge } from '@/shared/lib/intelligence-engine/constellations/constellation-engine';
import { findContagionPaths } from '@/shared/lib/intelligence-engine/constellations/contagion-paths';
import { findPath as findPathEngine } from '@/shared/lib/intelligence-engine/constellations/path-finder';
import { batchResolveZoneLabels, resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import {
  checkRateLimit,
  getClientIp,
  globalKey,
  ipKey,
  type RateLimitKey,
} from '@/shared/lib/security/rate-limit';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

const READ_WINDOW_SEC = 3600;
const READ_MAX_CALLS = 60; // público
const PATH_MAX_CALLS = 20; // heavier
const CONTAGION_MAX_CALLS = 30;

function resolveIpKey(headers: Headers | undefined, endpoint: string): RateLimitKey {
  if (!headers) return globalKey(endpoint);
  const pseudoRequest = { headers } as unknown as Request;
  const ip = getClientIp(pseudoRequest);
  if (ip === 'unknown') return globalKey(endpoint);
  return ipKey(pseudoRequest);
}

export const constellationsRouter = router({
  getEdges: publicProcedure
    .input(getEdgesInputSchema)
    .query(async ({ ctx, input }): Promise<readonly ConstellationEdge[]> => {
      const endpoint = 'constellations.getEdges';
      const key = resolveIpKey(ctx.headers, endpoint);
      const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      let query = supabase
        .from('zone_constellations_edges')
        .select('source_colonia_id, target_colonia_id, edge_weight, edge_types, period_date')
        .eq('source_colonia_id', input.coloniaId)
        .gte('edge_weight', input.minWeight)
        .order('period_date', { ascending: false })
        .order('edge_weight', { ascending: false })
        .limit(input.limit * 2);
      if (input.periodDate) query = query.eq('period_date', input.periodDate);

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data || data.length === 0) return [];

      let maxPeriod = '';
      for (const r of data) {
        if (typeof r.period_date === 'string' && r.period_date > maxPeriod) {
          maxPeriod = r.period_date;
        }
      }
      const filtered = input.periodDate ? data : data.filter((r) => r.period_date === maxPeriod);
      const slice = filtered.slice(0, input.limit);

      const labels = await batchResolveZoneLabels(
        slice.map((r) => ({
          scopeType: 'colonia',
          scopeId: r.target_colonia_id,
          countryCode: input.countryCode,
        })),
        { supabase },
      );

      return slice.map((r, idx) =>
        rowToConstellationEdge(
          {
            source_colonia_id: r.source_colonia_id,
            target_colonia_id: r.target_colonia_id,
            edge_weight: r.edge_weight,
            edge_types: r.edge_types as Json,
            period_date: r.period_date,
          },
          labels[idx] ?? null,
        ),
      );
    }),

  getClusters: publicProcedure
    .input(getClustersInputSchema)
    .query(async ({ ctx, input }): Promise<readonly ConstellationCluster[]> => {
      const endpoint = 'constellations.getClusters';
      const key = resolveIpKey(ctx.headers, endpoint);
      const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, READ_MAX_CALLS);
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      let query = supabase
        .from('zone_constellation_clusters')
        .select('zone_id, cluster_id, period_date')
        .order('period_date', { ascending: false });
      if (input.periodDate) query = query.eq('period_date', input.periodDate);

      const { data, error } = await query.limit(5000);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      const rows = data ?? [];
      if (rows.length === 0) return [];

      let maxPeriod = '';
      for (const r of rows) {
        if (typeof r.period_date === 'string' && r.period_date > maxPeriod)
          maxPeriod = r.period_date;
      }
      const filtered = input.periodDate ? rows : rows.filter((r) => r.period_date === maxPeriod);

      const byCluster = new Map<number, string[]>();
      for (const r of filtered) {
        if (typeof r.zone_id !== 'string' || typeof r.cluster_id !== 'number') continue;
        const arr = byCluster.get(r.cluster_id) ?? [];
        arr.push(r.zone_id);
        byCluster.set(r.cluster_id, arr);
      }

      // Resolve labels for all zones (dedup).
      const allZones = Array.from(new Set(filtered.map((r) => r.zone_id)));
      const labels = await batchResolveZoneLabels(
        allZones.map((zid) => ({
          scopeType: 'colonia',
          scopeId: zid,
          countryCode: input.countryCode,
        })),
        { supabase },
      );
      const labelMap = new Map<string, string | null>(
        allZones.map((zid, idx) => [zid, labels[idx] ?? null] as const),
      );

      const clusters: ConstellationCluster[] = [];
      for (const [clusterId, zones] of byCluster.entries()) {
        const members = zones.slice(0, input.limitPerCluster).map((zid) => ({
          zone_id: zid,
          zone_label: labelMap.get(zid) ?? null,
        }));
        clusters.push({
          cluster_id: clusterId,
          period_date: input.periodDate ?? maxPeriod,
          members,
          size: zones.length,
        });
      }

      // Ordenar por size desc — clusters grandes primero.
      return clusters.sort((a, b) => b.size - a.size);
    }),

  findPath: publicProcedure
    .input(findPathInputSchema)
    .mutation(async ({ ctx, input }): Promise<PathResult> => {
      const endpoint = 'constellations.findPath';
      const key = resolveIpKey(ctx.headers, endpoint);
      const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, PATH_MAX_CALLS);
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      return findPathEngine({
        sourceColoniaId: input.sourceColoniaId,
        targetColoniaId: input.targetColoniaId,
        maxHops: input.maxHops,
        ...(input.periodDate ? { periodDate: input.periodDate } : {}),
        countryCode: input.countryCode,
        supabase,
      });
    }),

  getContagionPaths: publicProcedure
    .input(getContagionPathsInputSchema)
    .query(async ({ ctx, input }): Promise<readonly ContagionPath[]> => {
      const endpoint = 'constellations.getContagionPaths';
      const key = resolveIpKey(ctx.headers, endpoint);
      const limit = await checkRateLimit(key, endpoint, READ_WINDOW_SEC, CONTAGION_MAX_CALLS);
      if (!limit.allowed) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'rate_limit_exceeded' });
      }

      const supabase = createAdminClient();
      return findContagionPaths({
        topN: input.topN,
        ...(input.periodDate ? { periodDate: input.periodDate } : {}),
        countryCode: input.countryCode,
        supabase,
      });
    }),
});

// Used only in tests — not exported from router directly.
export { resolveZoneLabel as _resolveZoneLabel };
