import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { adminProcedure, authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { detectHostMigrations, type ListingFingerprint } from '../lib/host-migration/matcher';

export const hostMigrationsRouter = router({
  scan: adminProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        market_id: z.string().uuid().optional(),
        min_confidence: z.number().min(0).max(1).default(0.7),
        min_delay_days: z.number().int().min(0).max(365).default(7),
        dry_run: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = createAdminClient();

      let query = supabase
        .from('str_listings')
        .select(
          'platform, listing_id, host_id, market_id, zone_id, geom, bedrooms, bathrooms, capacity, listing_name, first_seen_at',
        )
        .eq('country_code', input.country_code)
        .eq('status', 'active')
        .not('geom', 'is', null);
      if (input.market_id) {
        query = query.eq('market_id', input.market_id);
      }
      const { data: listings, error } = await query.limit(20_000);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      // Hidrata lon/lat. geom es PostGIS — Supabase REST devuelve hex WKB o GeoJSON
      // según config. Asumimos GeoJSON o objeto con coordinates. Skip si no parseable.
      const fingerprints: ListingFingerprint[] = [];
      for (const row of listings ?? []) {
        const lonLat = parseGeomLonLat(row.geom);
        if (!lonLat) continue;
        if (!isValidPlatform(row.platform)) continue;
        fingerprints.push({
          platform: row.platform,
          listing_id: row.listing_id,
          host_id: row.host_id,
          market_id: row.market_id,
          zone_id: row.zone_id,
          lon: lonLat.lon,
          lat: lonLat.lat,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms != null ? Number(row.bathrooms) : null,
          capacity: row.capacity,
          listing_name: row.listing_name,
          first_seen_at: row.first_seen_at,
        });
      }

      const matches = detectHostMigrations(fingerprints, {
        minConfidence: input.min_confidence,
        minDelayDays: input.min_delay_days,
      });

      let upserted = 0;
      if (!input.dry_run && matches.length > 0) {
        for (const match of matches) {
          const { error: upsertErr } = await supabase.from('str_host_migrations').upsert(
            {
              from_platform: match.from_platform,
              from_listing_id: match.from_listing_id,
              from_host_id: match.from_host_id,
              to_platform: match.to_platform,
              to_listing_id: match.to_listing_id,
              to_host_id: match.to_host_id,
              market_id: match.market_id,
              zone_id: match.zone_id,
              signature_hash: match.signature_hash,
              confidence: match.confidence,
              match_features: match.match_features as unknown as never,
              last_verified_at: new Date().toISOString(),
            },
            { onConflict: 'from_platform,from_listing_id,to_platform,to_listing_id' },
          );
          if (!upsertErr) upserted += 1;
        }
      }

      return {
        country_code: input.country_code,
        listings_scanned: fingerprints.length,
        matches_count: matches.length,
        upserted,
        dry_run: input.dry_run,
      };
    }),

  list: authenticatedProcedure
    .input(
      z.object({
        market_id: z.string().uuid().optional(),
        to_platform: z.enum(['airbnb', 'vrbo', 'booking']).optional(),
        min_confidence: z.number().min(0).max(1).default(0.7),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('str_host_migrations')
        .select(
          'id, from_platform, from_listing_id, from_host_id, to_platform, to_listing_id, to_host_id, market_id, signature_hash, confidence, match_features, first_detected_at',
        )
        .gte('confidence', input.min_confidence)
        .order('first_detected_at', { ascending: false })
        .limit(input.limit);
      if (input.market_id) query = query.eq('market_id', input.market_id);
      if (input.to_platform) query = query.eq('to_platform', input.to_platform);
      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  marketAlertPct: authenticatedProcedure
    .input(
      z.object({
        market_id: z.string().uuid(),
        lookback_days: z.number().int().min(1).max(365).default(30),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const rpc = (
        supabase.rpc as unknown as (
          fn: 'market_migration_alert_pct',
          args: { p_market_id: string; p_lookback_days: number },
        ) => Promise<{ data: number | string | null; error: { message: string } | null }>
      )('market_migration_alert_pct', {
        p_market_id: input.market_id,
        p_lookback_days: input.lookback_days,
      });
      const { data, error } = await rpc;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      const pct = data != null ? Number(data) : 0;
      return {
        market_id: input.market_id,
        lookback_days: input.lookback_days,
        migration_pct: pct,
        alert_triggered: pct > 10,
      };
    }),
});

function isValidPlatform(p: unknown): p is 'airbnb' | 'vrbo' | 'booking' {
  return p === 'airbnb' || p === 'vrbo' || p === 'booking';
}

function parseGeomLonLat(geom: unknown): { lon: number; lat: number } | null {
  if (geom == null) return null;
  // GeoJSON Point: { type: 'Point', coordinates: [lon, lat] }
  if (
    typeof geom === 'object' &&
    'coordinates' in (geom as Record<string, unknown>) &&
    Array.isArray((geom as { coordinates: unknown[] }).coordinates)
  ) {
    const coords = (geom as { coordinates: unknown[] }).coordinates;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return { lon: coords[0], lat: coords[1] };
    }
  }
  return null;
}
