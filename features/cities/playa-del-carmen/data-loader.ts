// ADR-059 — Playa del Carmen zones data loader
// FASE 14.1 sub-agent 1
// UPSERT zones master (country_code='MX' + scope_type='colonia' + parent_scope_id='playa-del-carmen')
// + zone_slugs canonical multilingual.
//
// scope_type 'colonia' canon-compliant con CHECK constraint zones_scope_type_valid
// (migration 20260424230000_create_zones_master_polymorphic.sql). Spec ADR-059 dice
// 'zona' a nivel narrativo, pero el valor canon BD es 'colonia' (semantic match
// para neighborhoods MX). zone_slugs.scope_type='colonia' tambien canon-compliant.
//
// NO crea polígonos PostGIS detallados — boundary se deja null H1, refinement
// L-NEW H2 con sources catastrales locales (Catastro Quintana Roo).

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

type ZonesInsertRow = Database['public']['Tables']['zones']['Insert'];
type ZoneSlugsInsertRow = Database['public']['Tables']['zone_slugs']['Insert'];

export interface ZoneInsertPlaya {
  readonly scope_type: 'colonia';
  readonly scope_id: string;
  readonly country_code: 'MX';
  readonly name_es: string;
  readonly name_en: string;
  readonly parent_scope_id: 'playa-del-carmen';
  readonly lat: number;
  readonly lng: number;
  readonly area_km2: number;
  readonly population: number;
  readonly metadata: Record<string, unknown>;
}

export const PLAYA_ZONES_CANON: ReadonlyArray<ZoneInsertPlaya> = [
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-centro',
    country_code: 'MX',
    name_es: 'Centro Playa del Carmen',
    name_en: 'Playa del Carmen Downtown',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.6296,
    lng: -87.0739,
    area_km2: 2.4,
    population: 18500,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'centro',
    },
  },
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-quinta-avenida',
    country_code: 'MX',
    name_es: '5ta Avenida',
    name_en: '5th Avenue',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.63,
    lng: -87.075,
    area_km2: 0.8,
    population: 4200,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'quinta-avenida',
    },
  },
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-playacar-fase-1',
    country_code: 'MX',
    name_es: 'Playacar Fase 1',
    name_en: 'Playacar Phase 1',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.6195,
    lng: -87.0762,
    area_km2: 1.6,
    population: 5400,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'playacar-fase-1',
    },
  },
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-playacar-fase-2',
    country_code: 'MX',
    name_es: 'Playacar Fase 2',
    name_en: 'Playacar Phase 2',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.6164,
    lng: -87.0689,
    area_km2: 2.1,
    population: 6800,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'playacar-fase-2',
    },
  },
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-la-veleta',
    country_code: 'MX',
    name_es: 'La Veleta',
    name_en: 'La Veleta',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.636,
    lng: -87.081,
    area_km2: 1.9,
    population: 7200,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'la-veleta',
    },
  },
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-selvamar',
    country_code: 'MX',
    name_es: 'Selvamar',
    name_en: 'Selvamar',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.6577,
    lng: -87.085,
    area_km2: 3.4,
    population: 4100,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'selvamar',
    },
  },
  {
    scope_type: 'colonia',
    scope_id: 'mx-qroo-playa-del-carmen-mayakoba',
    country_code: 'MX',
    name_es: 'Mayakoba',
    name_en: 'Mayakoba',
    parent_scope_id: 'playa-del-carmen',
    lat: 20.685,
    lng: -87.05,
    area_km2: 6.5,
    population: 1800,
    metadata: {
      admin_level: 10,
      data_source: 'manual',
      seed_version: 'v1_h1_playa',
      slug: 'mayakoba',
    },
  },
];

export interface LoadPlayaZonesResult {
  readonly inserted: number;
  readonly errors: ReadonlyArray<string>;
}

// UUID v5 namespace DMX_ZONES (mirror scripts/ingest/lib/zones-loader.ts).
// NO importa el script ingest porque ese archivo usa node:crypto + fs (Node-only)
// y este loader debe ser server-component-friendly.
const DMX_ZONES_NAMESPACE = 'f7e9c4a8-6b2d-4e5f-9a1c-8d3b2e7f6c5a';

async function uuidv5(name: string, namespace: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  const hex = namespace.replace(/-/g, '');
  const nsBytes = Buffer.from(hex, 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1').update(nsBytes).update(nameBytes).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  const b6 = bytes[6] ?? 0;
  const b8 = bytes[8] ?? 0;
  bytes[6] = (b6 & 0x0f) | 0x50;
  bytes[8] = (b8 & 0x3f) | 0x80;
  const out = bytes.toString('hex');
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20, 32)}`;
}

export async function generateZoneIdPlaya(zone: ZoneInsertPlaya): Promise<string> {
  return uuidv5(`${zone.country_code}:${zone.scope_type}:${zone.scope_id}`, DMX_ZONES_NAMESPACE);
}

export async function loadPlayaZones(
  supabase?: SupabaseClient<Database>,
): Promise<LoadPlayaZonesResult> {
  const client = supabase ?? createAdminClient();
  const errors: string[] = [];
  let inserted = 0;

  const zoneRows: ZonesInsertRow[] = [];
  const slugRows: Array<Omit<ZoneSlugsInsertRow, 'id' | 'created_at' | 'updated_at'>> = [];

  for (const zone of PLAYA_ZONES_CANON) {
    const id = await generateZoneIdPlaya(zone);
    zoneRows.push({
      id,
      country_code: zone.country_code,
      scope_type: zone.scope_type,
      scope_id: zone.scope_id,
      name_es: zone.name_es,
      name_en: zone.name_en,
      parent_scope_id: zone.parent_scope_id,
      lat: zone.lat,
      lng: zone.lng,
      area_km2: zone.area_km2,
      population: zone.population,
      metadata: zone.metadata as never,
    });

    const slugMeta = zone.metadata as { slug?: string };
    const slug = typeof slugMeta.slug === 'string' ? slugMeta.slug : zone.scope_id;
    slugRows.push({
      zone_id: id,
      scope_type: 'colonia',
      slug,
      country_code: zone.country_code,
      source_label: 'F14.1.0_playa_canonical',
    });
  }

  const { error: zoneErr, count } = await client.from('zones').upsert(zoneRows, {
    onConflict: 'country_code,scope_type,scope_id',
    count: 'exact',
  });
  if (zoneErr) {
    errors.push(`zones upsert failed: ${zoneErr.message}`);
  } else {
    inserted = count ?? zoneRows.length;
  }

  const { error: slugErr } = await client.from('zone_slugs').upsert(slugRows, {
    onConflict: 'slug',
  });
  if (slugErr) {
    errors.push(`zone_slugs upsert failed: ${slugErr.message}`);
  }

  return { inserted, errors };
}
