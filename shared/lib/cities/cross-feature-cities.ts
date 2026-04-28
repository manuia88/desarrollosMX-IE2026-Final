// ADR-059 + ADR-055 — Read-only cross-feature cities API.
// Consumed by features/cities/* + cross-functions M02 (asesor-desarrollos) + M17 (atlas/market).
// Server-side only — uses createAdminClient(); NO 'use client'.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getCitySettings } from './registry';

type AdminClient = SupabaseClient<Database>;

export interface CityProjectSummary {
  readonly id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly zoneId: string | null;
  readonly ciudad: string | null;
  readonly currency: string;
  readonly priceMin: number | null;
  readonly priceMax: number | null;
}

export interface CityZoneSummary {
  readonly id: string;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly scopeId: string;
}

export interface CityKpis {
  readonly projectsCount: number;
  readonly zonesCount: number;
  readonly avgPriceMxn: number | null;
  readonly lastUpdated: string;
}

function cityNameForMatch(citySlug: string): string | null {
  const settings = getCitySettings(citySlug);
  if (!settings) return null;
  if (citySlug === 'cdmx') return 'México';
  if (citySlug === 'playa-del-carmen') return 'Playa del Carmen';
  if (citySlug === 'guadalajara') return 'Guadalajara';
  if (citySlug === 'queretaro') return 'Querétaro';
  if (citySlug === 'dubai') return 'Dubai';
  return citySlug;
}

export async function getProjectsByCity(
  citySlug: string,
  supabase: AdminClient,
): Promise<ReadonlyArray<CityProjectSummary>> {
  const settings = getCitySettings(citySlug);
  if (!settings) return [];

  const cityName = cityNameForMatch(citySlug);
  if (!cityName) return [];

  const { data, error } = await supabase
    .from('proyectos')
    .select(
      'id, nombre, slug, zone_id, ciudad, currency, price_min_mxn, price_max_mxn, country_code',
    )
    .eq('country_code', settings.countryCode)
    .ilike('ciudad', `%${cityName}%`)
    .eq('is_active', true)
    .limit(500);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    slug: row.slug,
    zoneId: row.zone_id ?? null,
    ciudad: row.ciudad ?? null,
    currency: row.currency,
    priceMin: row.price_min_mxn ?? null,
    priceMax: row.price_max_mxn ?? null,
  }));
}

export async function getZonesByCity(
  citySlug: string,
  supabase: AdminClient,
): Promise<ReadonlyArray<CityZoneSummary>> {
  const settings = getCitySettings(citySlug);
  if (!settings) return [];

  const { data, error } = await supabase
    .from('zones')
    .select('id, name_es, name_en, lat, lng, scope_id, parent_scope_id, country_code')
    .eq('country_code', settings.countryCode)
    .eq('parent_scope_id', citySlug)
    .limit(500);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    nameEs: row.name_es,
    nameEn: row.name_en,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    scopeId: row.scope_id,
  }));
}

export async function getCityKpis(citySlug: string, supabase: AdminClient): Promise<CityKpis> {
  const settings = getCitySettings(citySlug);
  const emptyKpis: CityKpis = {
    projectsCount: 0,
    zonesCount: 0,
    avgPriceMxn: null,
    lastUpdated: new Date().toISOString(),
  };
  if (!settings) return emptyKpis;

  const [projects, zones] = await Promise.all([
    getProjectsByCity(citySlug, supabase),
    getZonesByCity(citySlug, supabase),
  ]);

  let totalPrice = 0;
  let priceCount = 0;
  for (const p of projects) {
    if (typeof p.priceMin === 'number' && typeof p.priceMax === 'number') {
      totalPrice += (p.priceMin + p.priceMax) / 2;
      priceCount += 1;
    } else if (typeof p.priceMin === 'number') {
      totalPrice += p.priceMin;
      priceCount += 1;
    } else if (typeof p.priceMax === 'number') {
      totalPrice += p.priceMax;
      priceCount += 1;
    }
  }

  return {
    projectsCount: projects.length,
    zonesCount: zones.length,
    avgPriceMxn: priceCount > 0 ? Math.round(totalPrice / priceCount) : null,
    lastUpdated: new Date().toISOString(),
  };
}
