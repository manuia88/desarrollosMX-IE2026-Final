// FASE 14.1 — Guadalajara city expansion (ADR-059 §Step 1).
// 8 zonas key Guadalajara — UPSERT en `zones` + `zone_slugs`.
// NO migrations BD: reuse infra existente (zones polymorphic + zone_slugs).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ZoneInsertGdl {
  readonly scope_type: 'colonia';
  readonly scope_id: string;
  readonly country_code: 'MX';
  readonly name_es: string;
  readonly name_en: string;
  readonly parent_scope_id: 'guadalajara';
  readonly lat: number;
  readonly lng: number;
  readonly slug: string;
  readonly metadata: {
    readonly admin_level: 10;
    readonly data_source: 'manual';
    readonly seed_version: 'v1_h1_gdl';
  };
}

export const GDL_ZONES_CANON: ReadonlyArray<ZoneInsertGdl> = [
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-providencia',
    country_code: 'MX',
    name_es: 'Providencia',
    name_en: 'Providencia',
    parent_scope_id: 'guadalajara',
    lat: 20.6957,
    lng: -103.376,
    slug: 'gdl-providencia',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-lafayette',
    country_code: 'MX',
    name_es: 'Lafayette',
    name_en: 'Lafayette',
    parent_scope_id: 'guadalajara',
    lat: 20.67,
    lng: -103.37,
    slug: 'gdl-lafayette',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-chapalita',
    country_code: 'MX',
    name_es: 'Chapalita',
    name_en: 'Chapalita',
    parent_scope_id: 'guadalajara',
    lat: 20.6669,
    lng: -103.3902,
    slug: 'gdl-chapalita',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-andares',
    country_code: 'MX',
    name_es: 'Andares',
    name_en: 'Andares',
    parent_scope_id: 'guadalajara',
    lat: 20.7126,
    lng: -103.4185,
    slug: 'gdl-andares',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-puerta-de-hierro',
    country_code: 'MX',
    name_es: 'Puerta de Hierro',
    name_en: 'Puerta de Hierro',
    parent_scope_id: 'guadalajara',
    lat: 20.7167,
    lng: -103.415,
    slug: 'gdl-puerta-de-hierro',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-zapopan-centro',
    country_code: 'MX',
    name_es: 'Zapopan Centro',
    name_en: 'Zapopan Centro',
    parent_scope_id: 'guadalajara',
    lat: 20.7236,
    lng: -103.3848,
    slug: 'gdl-zapopan-centro',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-country-club',
    country_code: 'MX',
    name_es: 'Country Club',
    name_en: 'Country Club',
    parent_scope_id: 'guadalajara',
    lat: 20.692,
    lng: -103.385,
    slug: 'gdl-country-club',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'MX-JAL-GDL-las-aguilas',
    country_code: 'MX',
    name_es: 'Las Águilas',
    name_en: 'Las Aguilas',
    parent_scope_id: 'guadalajara',
    lat: 20.63,
    lng: -103.404,
    slug: 'gdl-las-aguilas',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_gdl' },
  },
];

export interface LoadGdlZonesResult {
  readonly inserted: number;
  readonly errors: ReadonlyArray<{ readonly scope_id: string; readonly message: string }>;
}

/**
 * UPSERT 8 zonas Guadalajara + zone_slugs SEO.
 * Idempotente: re-run safe via UNIQUE(country_code, scope_type, scope_id) en zones
 * + UNIQUE(zone_id) y UNIQUE(slug) en zone_slugs.
 */
export async function loadGuadalajaraZones(
  // biome-ignore lint/suspicious/noExplicitAny: Supabase generic client typing diferido types regen post-merge
  supabase: SupabaseClient<any, 'public', any>,
): Promise<LoadGdlZonesResult> {
  const errors: Array<{ scope_id: string; message: string }> = [];
  let inserted = 0;

  for (const zone of GDL_ZONES_CANON) {
    const { data: zoneRow, error: zoneErr } = await supabase
      .from('zones')
      .upsert(
        {
          scope_type: zone.scope_type,
          scope_id: zone.scope_id,
          country_code: zone.country_code,
          name_es: zone.name_es,
          name_en: zone.name_en,
          parent_scope_id: zone.parent_scope_id,
          lat: zone.lat,
          lng: zone.lng,
          metadata: zone.metadata,
        },
        { onConflict: 'country_code,scope_type,scope_id' },
      )
      .select('id')
      .single();

    if (zoneErr || !zoneRow?.id) {
      errors.push({ scope_id: zone.scope_id, message: zoneErr?.message ?? 'no zone id returned' });
      continue;
    }

    const { error: slugErr } = await supabase.from('zone_slugs').upsert(
      {
        zone_id: zoneRow.id,
        scope_type: 'colonia',
        slug: zone.slug,
        country_code: zone.country_code,
        source_label: zone.name_es,
      },
      { onConflict: 'zone_id' },
    );

    if (slugErr) {
      errors.push({ scope_id: zone.scope_id, message: `slug: ${slugErr.message}` });
      continue;
    }

    inserted += 1;
  }

  return { inserted, errors };
}
