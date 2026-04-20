// AVM MVP I01 — fetchComparables 5 nearest similar.
// Ref: FASE_08 §BLOQUE 8.D.3.
//
// Consulta market_prices_secondary + operaciones (cuando exista) ordenadas por
// similitud euclidiana (distance_m + |Δsup_m2| + matching tipo_propiedad).
// Fallback fixture si la tabla no existe aún (BLOQUE 8.B market data pending).
//
// Devuelve top 5 con { id, distance_m, similarity_score, price_m2 }.
// similarity_score ∈ [0, 1] donde 1 = idéntico.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvmComparable, AvmPropertyInput } from './types';

interface MarketPriceRow {
  readonly id: string | number;
  readonly lat: number;
  readonly lng: number;
  readonly sup_m2: number;
  readonly price: number;
  readonly tipo_propiedad: string | null;
}

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as SupabaseClient<Record<string, unknown>>).from(table as never);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function similarity(distanceM: number, deltaSupPct: number, tipoMatch: boolean): number {
  const distScore = Math.max(0, 1 - distanceM / 5000); // >5km → 0
  const supScore = Math.max(0, 1 - Math.abs(deltaSupPct)); // >100% diff → 0
  const tipoScore = tipoMatch ? 1 : 0.5;
  return Number((0.5 * distScore + 0.3 * supScore + 0.2 * tipoScore).toFixed(3));
}

export interface FetchComparablesOptions {
  readonly maxResults?: number;
  readonly radiusMeters?: number;
  readonly fallbackFixture?: readonly AvmComparable[];
}

export async function fetchComparables(
  supabase: SupabaseClient | null,
  property: Pick<AvmPropertyInput, 'lat' | 'lng' | 'sup_m2' | 'tipo_propiedad'>,
  options: FetchComparablesOptions = {},
): Promise<readonly AvmComparable[]> {
  const maxResults = options.maxResults ?? 5;
  const radius = options.radiusMeters ?? 3000;

  if (!supabase) {
    return (options.fallbackFixture ?? []).slice(0, maxResults);
  }

  // ±0.03° lat/lng ≈ ±3km. Filtro bounding box para reducir payload.
  const latDelta = radius / 111000;
  const lngDelta = radius / (111000 * Math.cos((property.lat * Math.PI) / 180));

  let rows: MarketPriceRow[] = [];
  try {
    const { data } = await castFrom(supabase, 'market_prices_secondary')
      .select('id, lat, lng, sup_m2, price, tipo_propiedad')
      .gte('lat', property.lat - latDelta)
      .lte('lat', property.lat + latDelta)
      .gte('lng', property.lng - lngDelta)
      .lte('lng', property.lng + lngDelta)
      .limit(200);
    if (Array.isArray(data)) {
      rows = data as unknown as MarketPriceRow[];
    }
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    return (options.fallbackFixture ?? []).slice(0, maxResults);
  }

  const scored: AvmComparable[] = rows
    .filter((r) => typeof r.sup_m2 === 'number' && r.sup_m2 > 0 && r.price > 0)
    .map((r) => {
      const d = haversineMeters(property.lat, property.lng, r.lat, r.lng);
      const deltaSupPct = (r.sup_m2 - property.sup_m2) / property.sup_m2;
      const tipoMatch = r.tipo_propiedad === property.tipo_propiedad;
      return {
        id: String(r.id),
        distance_m: Math.round(d),
        similarity_score: similarity(d, deltaSupPct, tipoMatch),
        price_m2: Math.round(r.price / r.sup_m2),
      };
    })
    .filter((c) => c.distance_m <= radius)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, maxResults);

  return scored;
}

// Counter-estimate D6 — median price_m2 de comparables × sup_m2.
export function counterEstimateFromComparables(
  comparables: readonly AvmComparable[],
  supM2: number,
): number | null {
  if (comparables.length < 3) return null;
  const prices = comparables
    .map((c) => c.price_m2)
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  if (prices.length < 3) return null;
  const mid = Math.floor(prices.length / 2);
  const priceM2 =
    prices.length % 2 === 0
      ? ((prices[mid - 1] as number) + (prices[mid] as number)) / 2
      : (prices[mid] as number);
  return Math.round(priceM2 * supM2);
}
