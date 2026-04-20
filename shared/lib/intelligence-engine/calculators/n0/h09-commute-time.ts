// H09 Commute Time — Mapbox Directions API on-demand + cache 7d en zone_scores.
// Plan 8.B.14. Catálogo 03.8 §H09.
//
// Fórmula: score = max(0, 100 − (minutos_auto − 10) × 1.2) clamped 0-100.
//   10 min → 100 (excelente)
//   30 min → 76
//   45 min → 58
//   60 min → 40
//   90+ min → 0
//
// On-demand: invocación UI con input.params { destino_lat, destino_lng, profile? }.
// Cache 7d via valid_until (P1) en zone_scores row. Si valid_until > now()
// y mismo destino → retorna cached, else refetch.
//
// Mapbox token server-only: MAPBOX_SECRET_TOKEN (NO NEXT_PUBLIC_MAPBOX_TOKEN
// — TODO #14 CONTRATO §8). trackExternalCost('mapbox', 0.005) por request.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import { trackExternalCost } from '../run-score';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = max(0, 100 − (minutos_auto − 10) × 1.2). Score por tiempo al destino: 30min=76, 45min=58, 60min=40, 90min=0.',
  sources: ['mapbox_directions'],
  weights: { penalty_slope_per_min: 1.2, free_minutes: 10 },
  references: [
    {
      name: 'Mapbox Directions API',
      url: 'https://docs.mapbox.com/api/navigation/directions/',
      period: 'realtime',
    },
  ],
  confidence_thresholds: { high: 1, medium: 0, low: 0 }, // 1 ruta fetched = high
  validity: { unit: 'days', value: 7 },
  pricing_usd_per_request: 0.005,
} as const;

export const reasoning_template =
  'Commute Time de {zona_name} a destino ({destino_lat},{destino_lng}) obtiene {score_value}: {minutos_auto} min en auto (pico) + {minutos_transporte} min en transporte.';

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

export interface H09Components extends Record<string, unknown> {
  readonly destino_lat: number;
  readonly destino_lng: number;
  readonly minutos_auto: number;
  readonly minutos_transporte: number | null;
  readonly distancia_km: number;
  readonly profile: 'driving-traffic' | 'driving' | 'walking' | 'cycling';
}

export interface H09RawInput {
  readonly minutos_auto: number;
  readonly minutos_transporte?: number;
  readonly distancia_km: number;
  readonly destino_lat: number;
  readonly destino_lng: number;
  readonly profile: 'driving-traffic' | 'driving' | 'walking' | 'cycling';
}

export interface H09ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H09Components;
}

export function computeH09Commute(input: H09RawInput): H09ComputeResult {
  const penalty = Math.max(0, Math.min(100, (input.minutos_auto - 10) * 1.2));
  const value = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const confidence: Confidence = input.minutos_auto > 0 ? 'high' : 'insufficient_data';

  return {
    value,
    confidence,
    components: {
      destino_lat: input.destino_lat,
      destino_lng: input.destino_lng,
      minutos_auto: Number(input.minutos_auto.toFixed(1)),
      minutos_transporte:
        typeof input.minutos_transporte === 'number'
          ? Number(input.minutos_transporte.toFixed(1))
          : null,
      distancia_km: Number(input.distancia_km.toFixed(2)),
      profile: input.profile,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h09.insufficient';
  if (value >= 80) return 'ie.score.h09.excelente';
  if (value >= 60) return 'ie.score.h09.bueno';
  if (value >= 40) return 'ie.score.h09.moderado';
  return 'ie.score.h09.extenso';
}

// Server-only: llamada real a Mapbox Directions API. Acepta dependency
// `fetcher` para inyectar fetch en tests.
export interface MapboxRouteResponse {
  readonly minutos_auto: number;
  readonly distancia_km: number;
}

export async function fetchMapboxRoute(
  origin_lat: number,
  origin_lng: number,
  dest_lat: number,
  dest_lng: number,
  profile: H09RawInput['profile'],
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<MapboxRouteResponse> {
  const coords = `${origin_lng},${origin_lat};${dest_lng},${dest_lat}`;
  const url = `${MAPBOX_DIRECTIONS_URL}/${profile}/${coords}?access_token=${token}&overview=false`;
  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error(`Mapbox Directions API error ${res.status}`);
  }
  const data = (await res.json()) as {
    routes?: Array<{ duration: number; distance: number }>;
  };
  const route = data.routes?.[0];
  if (!route) throw new Error('Mapbox Directions: no routes returned');
  return {
    minutos_auto: route.duration / 60,
    distancia_km: route.distance / 1000,
  };
}

// Cache lookup: busca zone_scores con score_type='H09' + mismo destino + valid_until > now().
interface CachedH09Row {
  readonly score_value: number;
  readonly components: H09Components;
  readonly valid_until: string | null;
  readonly computed_at: string;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

export async function lookupH09Cache(
  supabase: SupabaseClient,
  zoneId: string,
  destino_lat: number,
  destino_lng: number,
): Promise<CachedH09Row | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_value, components, valid_until, computed_at')
      .eq('zone_id', zoneId)
      .eq('score_type', 'H09')
      .order('computed_at', { ascending: false })
      .limit(5);
    if (!data) return null;
    const rows = data as unknown as CachedH09Row[];
    const now = Date.now();
    const LATLNG_EPS = 0.0005; // ~50m
    for (const row of rows) {
      if (!row.valid_until) continue;
      if (Date.parse(row.valid_until) < now) continue;
      const c = row.components;
      if (
        Math.abs(c.destino_lat - destino_lat) < LATLNG_EPS &&
        Math.abs(c.destino_lng - destino_lng) < LATLNG_EPS
      ) {
        return row;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export const h09CommuteTimeCalculator: Calculator = {
  scoreId: 'H09',
  version,
  tier: 1,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const params = input.params as
      | {
          destino_lat?: number;
          destino_lng?: number;
          origin_lat?: number;
          origin_lng?: number;
          profile?: H09RawInput['profile'];
          token?: string; // override (tests)
          fetcher?: typeof fetch; // override (tests)
        }
      | undefined;
    const computed_at = new Date();

    if (
      !input.zoneId ||
      !params ||
      typeof params.destino_lat !== 'number' ||
      typeof params.destino_lng !== 'number' ||
      typeof params.origin_lat !== 'number' ||
      typeof params.origin_lng !== 'number'
    ) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'params.origin_lat/lng + destino_lat/lng required',
        },
        inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
        confidence: 'insufficient_data',
        citations: [
          {
            source: 'mapbox_directions',
            url: 'https://docs.mapbox.com/api/navigation/directions/',
            period: 'pending_params',
          },
        ],
        provenance: {
          sources: [{ name: 'mapbox_directions', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      };
    }

    const profile = params.profile ?? 'driving-traffic';

    // 1. Cache lookup
    const cached = await lookupH09Cache(
      supabase,
      input.zoneId,
      params.destino_lat,
      params.destino_lng,
    );
    if (cached) {
      return {
        score_value: cached.score_value,
        score_label: getLabelKey(cached.score_value, 'high'),
        components: { ...cached.components, cache_hit: true },
        inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId },
        confidence: 'high',
        citations: [
          {
            source: 'mapbox_directions',
            url: 'https://docs.mapbox.com/api/navigation/directions/',
            period: 'cached',
          },
        ],
        provenance: {
          sources: [
            {
              name: 'mapbox_directions',
              snapshot_date: cached.computed_at,
              count: 1,
            },
          ],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        template_vars: {
          zona_name: input.zoneId,
          destino_lat: params.destino_lat,
          destino_lng: params.destino_lng,
        },
        valid_until: cached.valid_until ?? undefined,
      };
    }

    // 2. Mapbox fetch (server-only token)
    const token = params.token ?? process.env.MAPBOX_SECRET_TOKEN ?? '';
    if (!token) {
      throw new Error('MAPBOX_SECRET_TOKEN missing — server-only (TODO #14)');
    }

    const route = await fetchMapboxRoute(
      params.origin_lat,
      params.origin_lng,
      params.destino_lat,
      params.destino_lng,
      profile,
      token,
      params.fetcher,
    );

    // 3. Track external cost
    await trackExternalCost('mapbox', methodology.pricing_usd_per_request);

    // 4. Compute score + return with 7d valid_until
    const res = computeH09Commute({
      minutos_auto: route.minutos_auto,
      distancia_km: route.distancia_km,
      destino_lat: params.destino_lat,
      destino_lng: params.destino_lng,
      profile,
    });

    return {
      score_value: res.value,
      score_label: getLabelKey(res.value, res.confidence),
      components: { ...res.components, cache_hit: false },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId },
      confidence: res.confidence,
      citations: [
        {
          source: 'mapbox_directions',
          url: 'https://docs.mapbox.com/api/navigation/directions/',
          period: 'realtime',
        },
      ],
      provenance: {
        sources: [
          {
            name: 'mapbox_directions',
            snapshot_date: computed_at.toISOString(),
            count: 1,
          },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zona_name: input.zoneId,
        destino_lat: params.destino_lat,
        destino_lng: params.destino_lng,
        minutos_auto: res.components.minutos_auto,
        minutos_transporte: res.components.minutos_transporte ?? 'n/a',
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h09CommuteTimeCalculator;
