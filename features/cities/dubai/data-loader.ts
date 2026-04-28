// FASE 14.1 — Dubai city expansion (ADR-059 §Step 1 zones seeding).
// 8 zonas key Dubai — UPSERT en `zones` + `zone_slugs`.
// NO migrations BD: reuse infra existente (zones polymorphic + zone_slugs).
// NOTE: hasta Reelly active, zones seedean independiente. Proyectos vacíos hasta sync.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ZoneInsertDubai {
  readonly scope_type: 'colonia';
  readonly scope_id: string;
  readonly country_code: 'AE';
  readonly name_es: string;
  readonly name_en: string;
  readonly parent_scope_id: 'dubai';
  readonly lat: number;
  readonly lng: number;
  readonly slug: string;
  readonly metadata: {
    readonly admin_level: 10;
    readonly data_source: 'manual';
    readonly seed_version: 'v1_h1_dubai';
  };
}

export const DUBAI_ZONES_CANON: ReadonlyArray<ZoneInsertDubai> = [
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-downtown-dubai',
    country_code: 'AE',
    name_es: 'Downtown Dubai',
    name_en: 'Downtown Dubai',
    parent_scope_id: 'dubai',
    lat: 25.1972,
    lng: 55.2744,
    slug: 'dubai-downtown',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-dubai-marina',
    country_code: 'AE',
    name_es: 'Dubai Marina',
    name_en: 'Dubai Marina',
    parent_scope_id: 'dubai',
    lat: 25.0801,
    lng: 55.1391,
    slug: 'dubai-marina',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-palm-jumeirah',
    country_code: 'AE',
    name_es: 'Palm Jumeirah',
    name_en: 'Palm Jumeirah',
    parent_scope_id: 'dubai',
    lat: 25.1124,
    lng: 55.139,
    slug: 'dubai-palm-jumeirah',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-business-bay',
    country_code: 'AE',
    name_es: 'Business Bay',
    name_en: 'Business Bay',
    parent_scope_id: 'dubai',
    lat: 25.1888,
    lng: 55.263,
    slug: 'dubai-business-bay',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-difc',
    country_code: 'AE',
    name_es: 'DIFC',
    name_en: 'DIFC',
    parent_scope_id: 'dubai',
    lat: 25.2138,
    lng: 55.2792,
    slug: 'dubai-difc',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-jlt',
    country_code: 'AE',
    name_es: 'Jumeirah Lakes Towers',
    name_en: 'Jumeirah Lakes Towers',
    parent_scope_id: 'dubai',
    lat: 25.07,
    lng: 55.1413,
    slug: 'dubai-jlt',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-jvc',
    country_code: 'AE',
    name_es: 'Jumeirah Village Circle',
    name_en: 'Jumeirah Village Circle',
    parent_scope_id: 'dubai',
    lat: 25.0577,
    lng: 55.2078,
    slug: 'dubai-jvc',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
  {
    scope_type: 'colonia',
    scope_id: 'AE-DXB-arabian-ranches',
    country_code: 'AE',
    name_es: 'Arabian Ranches',
    name_en: 'Arabian Ranches',
    parent_scope_id: 'dubai',
    lat: 25.0436,
    lng: 55.2658,
    slug: 'dubai-arabian-ranches',
    metadata: { admin_level: 10, data_source: 'manual', seed_version: 'v1_h1_dubai' },
  },
];

export interface LoadDubaiZonesResult {
  readonly inserted: number;
  readonly errors: ReadonlyArray<{ readonly scope_id: string; readonly message: string }>;
}

/**
 * UPSERT 8 zonas Dubai + zone_slugs SEO.
 * Idempotente: re-run safe via UNIQUE(country_code, scope_type, scope_id) en zones
 * + UNIQUE(zone_id) y UNIQUE(slug) en zone_slugs.
 * NOTE: hasta Reelly activación H2, proyectos quedan vacíos — zones se siembran solas.
 */
export async function loadDubaiZones(
  // biome-ignore lint/suspicious/noExplicitAny: Supabase generic client typing diferido types regen post-merge
  supabase: SupabaseClient<any, 'public', any>,
): Promise<LoadDubaiZonesResult> {
  const errors: Array<{ scope_id: string; message: string }> = [];
  let inserted = 0;

  for (const zone of DUBAI_ZONES_CANON) {
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
        source_label: zone.name_en,
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
