#!/usr/bin/env node
/**
 * Populate zones.boundary / area_km2 / h3_r8 para colonias ya sembradas en public.zones.
 *
 * Estrategia H1 (sprint SESIÓN 07.5.A):
 *  - Intentar cargar GeoJSON real desde content/zones/boundaries/<scope_id>.geojson.
 *    (En este sprint ese directorio NO existe todavía — INEGI MGN per-colonia no está
 *    disponible como endpoint estable. El script queda preparado para cuando se ingieran
 *    shapefiles oficiales: drop .geojson ahí y re-run.)
 *  - Fallback determinístico: bbox cuadrado de ~500m centrado en lat/lng existente.
 *    Marcado claramente en metadata como boundary_source='fallback:bbox-500m'.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/ingest/01_ingest-geo-boundaries.ts
 *
 * Flags:
 *   --dry-run        Preview sin UPDATE real. Imprime summary y sale 0.
 *   --limit=N        Procesa sólo las primeras N colonias (default: ALL, cap hard 250).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { latLngToCell } from 'h3-js';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from './lib/ingest-run-helper.ts';

type CliArgs = {
  dryRun: boolean;
  limit: number | null;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  lat: number | null;
  lng: number | null;
  metadata: Json;
};

type BoundarySource = 'real:file' | 'fallback:bbox-500m';

type BuiltBoundary = {
  ewkt: string;
  areaKm2: number;
  centroid: [number, number]; // [lng, lat]
};

type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

type GeoJsonFeature = {
  type: 'Feature';
  geometry: GeoJsonPolygon | { type: string; coordinates: unknown };
  properties?: unknown;
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

const SOURCE = 'inegi_mgn';
const COUNTRY = 'MX';
const SCOPE_TYPE = 'colonia';
const HARD_CAP = 250;
const H3_RES = 8;

// --------------------------------------------------------------------------
// Helpers puros (exportados para tests)
// --------------------------------------------------------------------------

/**
 * Construye un polígono cuadrado de ~500m (lado ≈ 1 km) centrado en (lat, lng).
 * Devuelve EWKT con SRID=4326 (PostGIS parsea text→geography con ese prefijo).
 * Los deltas lat/lng se ajustan por latitud para aproximar km² reales.
 */
export function buildBboxPolygon500m(lat: number, lng: number): BuiltBoundary {
  // dLat/dLng representan el LADO TOTAL del bbox en grados (~500m).
  // Para centrar el polígono en (lat, lng), cada offset desde el centroide es la MITAD.
  const dLat = 0.00449; // ~500m de lado total en latitud
  const dLng = 0.00475 / Math.cos((lat * Math.PI) / 180); // ~500m de lado total ajustado por latitud

  const halfLat = dLat / 2;
  const halfLng = dLng / 2;

  const minLat = lat - halfLat;
  const maxLat = lat + halfLat;
  const minLng = lng - halfLng;
  const maxLng = lng + halfLng;

  // EWKT: lng lat (order PostGIS)
  const coords = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat], // cierre
  ];

  const coordsStr = coords.map(([x, y]) => `${x} ${y}`).join(', ');
  const ewkt = `SRID=4326;MULTIPOLYGON(((${coordsStr})))`;

  // Área aproximada en km² (bbox small ⇒ planar approximation OK):
  // latDeg→km ≈ 110.574, lngDeg→km ≈ 111.320 * cos(lat)
  const heightKm = Math.abs(dLat) * 110.574;
  const widthKm = Math.abs(dLng) * 111.32 * Math.cos((lat * Math.PI) / 180);
  const areaKm2 = heightKm * widthKm;

  return {
    ewkt,
    areaKm2,
    centroid: [lng, lat],
  };
}

/**
 * Merge metadata existente con marcadores de procedencia del boundary.
 * NO borra keys existentes.
 */
export function buildMetadataForBoundary(
  source: BoundarySource,
  existingMeta: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existingMeta,
    boundary_source: source,
    boundary_added_at: new Date().toISOString(),
  };
}

/**
 * H3 index resolución 8 (celda ≈ 0.7 km²) desde lat/lng centroide.
 */
export function computeH3R8(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RES);
}

/**
 * Parsea un GeoJSON FeatureCollection con al menos un feature Polygon y lo
 * convierte a EWKT SRID=4326 + area_km2 (planar approx) + centroide.
 * Devuelve null si el archivo no existe. Throw si existe pero está mal formado.
 */
export async function loadRealBoundaryEwktIfExists(
  scopeId: string,
  contentRoot: string,
): Promise<BuiltBoundary | null> {
  const file = path.join(contentRoot, `${scopeId}.geojson`);
  let raw: string;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!isFeatureCollection(parsed)) {
    throw new Error(`[ingest-geo] ${file}: expected FeatureCollection`);
  }
  const polygonFeature = parsed.features.find(
    (f): f is GeoJsonFeature & { geometry: GeoJsonPolygon } =>
      f.geometry != null && f.geometry.type === 'Polygon',
  );
  if (polygonFeature == null) {
    throw new Error(`[ingest-geo] ${file}: no Polygon feature found`);
  }

  const ring = polygonFeature.geometry.coordinates[0];
  if (ring == null || ring.length < 4) {
    throw new Error(`[ingest-geo] ${file}: Polygon ring needs ≥4 points (with closure)`);
  }

  // Validar que cada punto es [lng, lat] number
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) {
      throw new Error(`[ingest-geo] ${file}: malformed ring point`);
    }
    const x = pt[0];
    const y = pt[1];
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error(`[ingest-geo] ${file}: non-numeric ring point`);
    }
  }

  // EWKT
  const ewktCoords = ring
    .map((pt) => {
      const x = pt[0] as number;
      const y = pt[1] as number;
      return `${x} ${y}`;
    })
    .join(', ');
  const ewkt = `SRID=4326;MULTIPOLYGON(((${ewktCoords})))`;

  // Centroide: promedio simple (OK para polígonos pequeños).
  let sumLng = 0;
  let sumLat = 0;
  const uniquePoints = ring.slice(0, -1); // descarta cierre
  for (const pt of uniquePoints) {
    sumLng += pt[0] as number;
    sumLat += pt[1] as number;
  }
  const centroidLng = sumLng / uniquePoints.length;
  const centroidLat = sumLat / uniquePoints.length;

  // Área planar approx (shoelace en grados × factor lat).
  const areaKm2 = planarPolygonAreaKm2(ring, centroidLat);

  return {
    ewkt,
    areaKm2,
    centroid: [centroidLng, centroidLat],
  };
}

function isFeatureCollection(v: unknown): v is GeoJsonFeatureCollection {
  if (typeof v !== 'object' || v == null) return false;
  const obj = v as Record<string, unknown>;
  return obj.type === 'FeatureCollection' && Array.isArray(obj.features);
}

function planarPolygonAreaKm2(ring: number[][], refLat: number): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (a == null || b == null) continue;
    const x1 = a[0] as number;
    const y1 = a[1] as number;
    const x2 = b[0] as number;
    const y2 = b[1] as number;
    sum += x1 * y2 - x2 * y1;
  }
  const areaDeg2 = Math.abs(sum) / 2;
  // 1 deg lat ≈ 110.574 km ; 1 deg lng ≈ 111.320 * cos(lat) km
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((refLat * Math.PI) / 180);
  return areaDeg2 * kmPerDegLat * kmPerDegLng;
}

// --------------------------------------------------------------------------
// CLI plumbing
// --------------------------------------------------------------------------

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit: number | null = null;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[ingest-geo] --limit inválido: "${a}"`);
      }
      limit = n;
    }
  }
  return { dryRun, limit };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[ingest-geo] Falta env var requerida: ${name}. Asegúrate de exportarla antes de correr el script.`,
    );
  }
  return v;
}

function isJsonObject(v: Json): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);

  const contentRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../content/zones/boundaries',
  );

  console.log(
    `[ingest-geo] contentRoot=${contentRoot} dryRun=${args.dryRun} limit=${args.limit ?? '(all)'}`,
  );

  if (args.dryRun) {
    // Preview puro (sin BD): muestra cómo se vería el fallback para CDMX centro.
    const demo = buildBboxPolygon500m(19.4326, -99.1332);
    const h3 = computeH3R8(19.4326, -99.1332);
    const preview = {
      dry_run: true,
      fallback_demo_cdmx_centro: {
        h3_r8: h3,
        area_km2: Number(demo.areaKm2.toFixed(4)),
        ewkt_head: `${demo.ewkt.slice(0, 60)}...`,
      },
      note: 'No se tocó BD. Ejecuta sin --dry-run con envs para aplicar.',
    };
    console.log('[ingest-geo] DRY RUN — preview:');
    console.log(JSON.stringify(preview, null, 2));
    return 0;
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: COUNTRY,
      triggeredBy: 'cli:ingest-geo-boundaries',
      meta: {
        script: '01_ingest-geo-boundaries.ts',
        dry_run: args.dryRun,
        limit: args.limit,
      } as Json,
      expectedPeriodicity: 'yearly',
      upsertWatermarkOnSuccess: true,
    },
    async () => {
      // Fetch colonias MX con lat/lng
      let query = supabase
        .from('zones')
        .select('id, scope_id, lat, lng, metadata')
        .eq('country_code', COUNTRY)
        .eq('scope_type', SCOPE_TYPE)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('scope_id', { ascending: true });

      if (args.limit != null) {
        query = query.limit(args.limit);
      }

      const { data: zonesData, error: zonesErr } = await query;
      if (zonesErr) {
        throw new Error(`[ingest-geo] fetch zones: ${zonesErr.message}`);
      }
      const zones = (zonesData ?? []) as ZoneRow[];

      if (zones.length > HARD_CAP) {
        throw new Error(
          `[ingest-geo] cost-cap: ${zones.length} zones > HARD_CAP=${HARD_CAP}. Usa --limit o partitioning.`,
        );
      }

      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const z of zones) {
        if (z.lat == null || z.lng == null) {
          skipped++;
          continue;
        }
        try {
          const real = await loadRealBoundaryEwktIfExists(z.scope_id, contentRoot);
          const source: BoundarySource = real == null ? 'fallback:bbox-500m' : 'real:file';
          const built = real ?? buildBboxPolygon500m(z.lat, z.lng);
          const [centroidLng, centroidLat] = built.centroid;
          const h3 = computeH3R8(centroidLat, centroidLng);
          const existingMeta = isJsonObject(z.metadata) ? z.metadata : {};
          const mergedMeta = buildMetadataForBoundary(source, existingMeta) as Json;

          const { error: updErr } = await supabase
            .from('zones')
            .update({
              boundary: built.ewkt,
              h3_r8: h3,
              area_km2: Number(built.areaKm2.toFixed(6)),
              metadata: mergedMeta,
            })
            .eq('id', z.id);

          if (updErr) {
            errors.push(`${z.scope_id}: ${updErr.message}`);
            skipped++;
          } else {
            updated++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${z.scope_id}: ${msg}`);
          skipped++;
        }
      }

      if (errors.length > 0) {
        console.error(`[ingest-geo] errors (${errors.length}):`);
        for (const e of errors) console.error(`  - ${e}`);
      }

      return {
        counts: { inserted: 0, updated, skipped },
        lastSuccessfulPeriodEnd: '2020-12-31', // último censo oficial base MGN
      };
    },
  );

  const output = {
    run_id: result.runId,
    status: result.status,
    inserted: result.counts.inserted,
    updated: result.counts.updated,
    skipped: result.counts.skipped,
    error: result.error,
    duration_ms: result.durationMs,
  };
  console.log(JSON.stringify(output, null, 2));

  return result.status === 'success' ? 0 : 1;
}

// Guard: sólo ejecuta main() cuando el módulo es el entry point (no al importar desde tests).
const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[ingest-geo] FATAL:', err);
      process.exit(1);
    });
}
