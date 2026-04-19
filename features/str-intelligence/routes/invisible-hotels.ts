import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { adminProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { type CandidateCluster, classifyClusters } from '../lib/invisible-hotels/cluster-detector';

type DetectCandidateRow = {
  host_id: string;
  market_id: string | null;
  listings_count: number;
  center_lon: number;
  center_lat: number;
  bounding_radius_m: number;
  listing_ids: string[];
};

export const invisibleHotelsRouter = router({
  scan: adminProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        min_listings: z.number().int().min(3).max(50).default(5),
        max_radius_m: z.number().int().min(50).max(2000).default(200),
        dry_run: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = createAdminClient();

      const detectRpc = (
        supabase.rpc as unknown as (
          fn: 'detect_invisible_hotel_candidates',
          args: {
            p_country_code: string;
            p_min_listings: number;
            p_max_radius_m: number;
          },
        ) => Promise<{ data: DetectCandidateRow[] | null; error: { message: string } | null }>
      )('detect_invisible_hotel_candidates', {
        p_country_code: input.country_code,
        p_min_listings: input.min_listings,
        p_max_radius_m: input.max_radius_m,
      });

      const { data: candidates, error } = await detectRpc;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      // Hidrata listing_name de los listing_ids para el prefix matcher.
      const allListingIds = (candidates ?? []).flatMap((c) => c.listing_ids).slice(0, 5_000);
      const { data: listingNames } = allListingIds.length
        ? await supabase
            .from('str_listings')
            .select('listing_id, listing_name')
            .in('listing_id', allListingIds)
        : { data: [] };

      const nameByListingId = new Map<string, string | null>();
      for (const row of listingNames ?? []) {
        nameByListingId.set(row.listing_id, row.listing_name ?? null);
      }

      const candidateClusters: CandidateCluster[] = (candidates ?? []).map((c) => ({
        host_id: c.host_id,
        market_id: c.market_id,
        listings_count: c.listings_count,
        center_lon: c.center_lon,
        center_lat: c.center_lat,
        bounding_radius_m: c.bounding_radius_m,
        listing_ids: c.listing_ids,
        listings_meta: c.listing_ids.map((id) => ({
          listing_id: id,
          listing_name: nameByListingId.get(id) ?? null,
        })),
      }));

      const detected = classifyClusters(candidateClusters);

      let upserted = 0;
      if (!input.dry_run && detected.length > 0) {
        for (const cluster of detected) {
          const { error: upsertErr } = await supabase.from('str_invisible_hotels').upsert(
            {
              host_id: cluster.host_id,
              country_code: input.country_code,
              market_id: cluster.market_id,
              listings_count: cluster.listings_count,
              center_geom:
                `SRID=4326;POINT(${cluster.center_lon} ${cluster.center_lat})` as unknown as never,
              bounding_radius_m: cluster.bounding_radius_m,
              detection_method: cluster.detection_method,
              confidence: cluster.confidence,
              last_verified_at: new Date().toISOString(),
              meta: {
                heuristics: cluster.heuristics,
                listing_ids: cluster.listing_ids,
              } as never,
            },
            { onConflict: 'host_id,market_id' },
          );
          if (!upsertErr) upserted += 1;
        }
      }

      return {
        country_code: input.country_code,
        candidates_count: candidates?.length ?? 0,
        detected_count: detected.length,
        upserted,
        dry_run: input.dry_run,
      };
    }),

  list: adminProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        min_confidence: z.number().min(0).max(1).default(0.5),
        manual_review_status: z
          .enum(['pending', 'confirmed', 'false_positive', 'unknown'])
          .optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('str_invisible_hotels')
        .select(
          'cluster_id, host_id, country_code, market_id, listings_count, bounding_radius_m, detection_method, confidence, manual_review_status, manual_review_notes, first_detected_at, last_verified_at, meta',
        )
        .eq('country_code', input.country_code)
        .gte('confidence', input.min_confidence)
        .order('confidence', { ascending: false })
        .order('listings_count', { ascending: false })
        .limit(input.limit);
      if (input.manual_review_status) {
        query = query.eq('manual_review_status', input.manual_review_status);
      }
      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  reviewCluster: adminProcedure
    .input(
      z.object({
        cluster_id: z.string().uuid(),
        manual_review_status: z.enum(['confirmed', 'false_positive', 'unknown']),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('str_invisible_hotels')
        .update({
          manual_review_status: input.manual_review_status,
          manual_review_notes: input.notes ?? null,
          manual_reviewed_by: ctx.user.id,
          manual_reviewed_at: new Date().toISOString(),
        })
        .eq('cluster_id', input.cluster_id);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),

  exportCsv: adminProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        min_confidence: z.number().min(0).max(1).default(0.7),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_invisible_hotels')
        .select(
          'cluster_id, host_id, country_code, market_id, listings_count, bounding_radius_m, detection_method, confidence, manual_review_status, first_detected_at, last_verified_at',
        )
        .eq('country_code', input.country_code)
        .gte('confidence', input.min_confidence)
        .in('manual_review_status', ['confirmed', 'pending'])
        .order('listings_count', { ascending: false });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      const rows = data ?? [];
      const header = [
        'cluster_id',
        'host_id',
        'country_code',
        'market_id',
        'listings_count',
        'bounding_radius_m',
        'detection_method',
        'confidence',
        'manual_review_status',
        'first_detected_at',
        'last_verified_at',
      ].join(',');
      const body = rows
        .map((r) =>
          [
            r.cluster_id,
            JSON.stringify(r.host_id),
            r.country_code,
            r.market_id ?? '',
            r.listings_count,
            r.bounding_radius_m,
            r.detection_method,
            r.confidence,
            r.manual_review_status,
            r.first_detected_at,
            r.last_verified_at,
          ].join(','),
        )
        .join('\n');
      return {
        country_code: input.country_code,
        rows: rows.length,
        csv: `${header}\n${body}`,
      };
    }),
});
