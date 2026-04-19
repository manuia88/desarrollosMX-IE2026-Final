import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { type IngestDriver, registerDriver } from '../driver';
import { pointToH3R8 } from '../h3';
import { recordLineage } from '../lineage';
import { type RunIngestOptions, runIngest } from '../orchestrator';
import {
  duplicateDetectionGate,
  geoValidityGateMx,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import type { IngestCtx, IngestJob, IngestResult } from '../types';

// Atlas Nacional de Riesgos (CENAPRED). Publica shapefiles por tipo de
// riesgo: sismicidad, hundimientos, inundaciones, deslaves, volcánico,
// tsunami. Cada shapefile contiene polígonos de zonas de riesgo con
// propiedades (NIVEL, NOM_ZONA, etc.).
//
// Shapefile parsing: bloqueante externo — shpjs/shapefile NO instaladas y
// FASE 07 no autoriza nuevas deps. El driver consume FeatureCollection
// GeoJSON pre-convertido (admin corre shp2pgsql o mapshaper externo y
// pasa el GeoJSON resultante). Conversión in-driver agendada FASE 07b.A.
//
// geom (MultiPolygon/Polygon) se omite del upsert a geo_data_points —
// mismo patrón que denue.ts: Supabase SDK no tipa PostGIS directamente.
// lat/lng del centroide + h3_r8 quedan en meta; geom materializable
// downstream via RPC con ST_GeomFromGeoJSON.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.4

export const ATLAS_SOURCE = 'atlas_riesgos' as const;
export const ATLAS_PERIODICITY = 'yearly' as const;
export const ATLAS_ENTITY_TYPE = 'risk_zone' as const;
export const ATLAS_UPSTREAM_URL = 'https://www.atlasnacionalderiesgos.gob.mx/';

// Tipos canónicos. Si CENAPRED agrega uno nuevo, se actualiza aquí.
// Inputs fuera de esta lista se rechazan en ingestAtlasRiesgos.
export const ATLAS_RISK_TYPES = [
  'sismicidad',
  'hundimientos',
  'inundaciones',
  'deslaves',
  'volcanico',
  'tsunami',
] as const;

export type AtlasRiskType = (typeof ATLAS_RISK_TYPES)[number];

const ATLAS_RISK_SET = new Set<string>(ATLAS_RISK_TYPES);

export function isAtlasRiskType(v: string): v is AtlasRiskType {
  return ATLAS_RISK_SET.has(v);
}

// Zod schema mínimo para validar FeatureCollection GeoJSON. No obliga
// SRS — CENAPRED publica mayormente en EPSG:4326 tras conversión shp2pgsql.
// properties es unknown intencional (CENAPRED usa nombres heterogéneos
// NOM_ZONA / nombre / NIVEL / riesgo / etc.).
const PositionSchema = z.array(z.number()).min(2);

const PolygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(PositionSchema)),
});

const MultiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(PositionSchema))),
});

const GeometrySchema = z.union([PolygonGeometrySchema, MultiPolygonGeometrySchema]);

const AtlasFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema,
  properties: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const AtlasFeatureCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(AtlasFeatureSchema),
});

export type AtlasFeature = z.infer<typeof AtlasFeatureSchema>;
export type AtlasFeatureCollectionT = z.infer<typeof AtlasFeatureCollection>;

export type AtlasRiskLevel = 'alta' | 'media' | 'baja' | null;

export interface AtlasParsedRow {
  source_id: string;
  entity_type: typeof ATLAS_ENTITY_TYPE;
  name: string;
  scian_code: null;
  h3_r8: string | null;
  lat: number | null;
  lng: number | null;
  meta: {
    risk_type: AtlasRiskType;
    risk_level: AtlasRiskLevel;
    properties: Record<string, unknown>;
  };
}

// FNV-1a 32-bit hash hex — natural key dedup cuando feature.properties.id
// está ausente. Hash opera sobre coords serializadas del primer ring para
// estabilidad inter-runs.
function hashGeom(coords: number[][]): string {
  const s = coords.map((c) => `${c[0]},${c[1]}`).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// Centroide simple: promedio de coords del primer ring (exterior ring para
// Polygon, primer ring del primer polígono para MultiPolygon). NO es
// centroide geodésico verdadero — suficiente para h3_r8 bucketing.
export function centroidOfPolygon(
  geometry: AtlasFeature['geometry'],
): { lat: number; lng: number } | null {
  let ring: number[][] | null = null;
  if (geometry.type === 'Polygon') {
    ring = geometry.coordinates[0] ?? null;
  } else {
    ring = geometry.coordinates[0]?.[0] ?? null;
  }
  if (!ring || ring.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  for (const c of ring) {
    const lng = c[0];
    const lat = c[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    sumLng += lng;
    sumLat += lat;
    count++;
  }
  if (count === 0) return null;
  return { lng: sumLng / count, lat: sumLat / count };
}

// Extrae coords planas del primer ring para hash estable. Separado de
// centroidOfPolygon para permitir hash aun si centroide falla.
function firstRingCoords(geometry: AtlasFeature['geometry']): number[][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0] ?? [];
  }
  return geometry.coordinates[0]?.[0] ?? [];
}

function toLowerTrim(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().toLowerCase();
  return t === '' ? null : t;
}

// Interpreta properties.NIVEL / nivel / riesgo / grado → alta|media|baja|null.
// CENAPRED usa "ALTO"/"MEDIO"/"BAJO" mayormente; algunos datasets usan
// 1/2/3 o "Muy alto"/"Moderado"/"Bajo". Heurística substring sobre norm.
export function parseAtlasRiskLevel(properties: Record<string, unknown>): AtlasRiskLevel {
  const raw =
    toLowerTrim(properties.NIVEL) ??
    toLowerTrim(properties.nivel) ??
    toLowerTrim(properties.RIESGO) ??
    toLowerTrim(properties.riesgo) ??
    toLowerTrim(properties.GRADO) ??
    toLowerTrim(properties.grado);
  if (!raw) return null;
  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/alt/.test(norm)) return 'alta';
  if (/med|moderad/.test(norm)) return 'media';
  if (/baj/.test(norm)) return 'baja';
  if (norm === '1') return 'alta';
  if (norm === '2') return 'media';
  if (norm === '3') return 'baja';
  return null;
}

function extractName(properties: Record<string, unknown>, riskType: AtlasRiskType): string {
  const candidates: Array<unknown> = [
    properties.NOM_ZONA,
    properties.nom_zona,
    properties.NOMBRE,
    properties.nombre,
    properties.NAME,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim();
  }
  return riskType;
}

function extractId(properties: Record<string, unknown>): string | null {
  const candidates: Array<unknown> = [
    properties.id,
    properties.ID,
    properties.FID,
    properties.fid,
    properties.OBJECTID,
    properties.objectid,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s !== '') return s;
  }
  return null;
}

export interface ParseAtlasInput {
  fc: AtlasFeatureCollectionT;
  riskType: AtlasRiskType;
}

export function parseAtlasGeoJson(input: ParseAtlasInput): AtlasParsedRow[] {
  const { fc, riskType } = input;
  if (!isAtlasRiskType(riskType)) {
    throw new Error('atlas_invalid_risk_type');
  }
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) return [];

  const out: AtlasParsedRow[] = [];
  for (const feature of fc.features) {
    if (!feature || feature.type !== 'Feature') continue;
    if (!feature.geometry) continue;
    if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
      continue;
    }
    const properties = (feature.properties ?? {}) as Record<string, unknown>;

    // Centroide vía property cached si existe, sino compute.
    let centroid: { lat: number; lng: number } | null = null;
    const cached = properties.centroid;
    if (
      cached &&
      typeof cached === 'object' &&
      typeof (cached as { lat?: unknown }).lat === 'number' &&
      typeof (cached as { lng?: unknown }).lng === 'number'
    ) {
      centroid = {
        lat: (cached as { lat: number }).lat,
        lng: (cached as { lng: number }).lng,
      };
    } else {
      centroid = centroidOfPolygon(feature.geometry);
    }

    const propId = extractId(properties);
    const sourceIdBase = propId ?? hashGeom(firstRingCoords(feature.geometry));
    const sourceId = `${riskType}:${sourceIdBase}`;

    out.push({
      source_id: sourceId,
      entity_type: ATLAS_ENTITY_TYPE,
      name: extractName(properties, riskType),
      scian_code: null,
      h3_r8: centroid ? pointToH3R8(centroid) : null,
      lat: centroid?.lat ?? null,
      lng: centroid?.lng ?? null,
      meta: {
        risk_type: riskType,
        risk_level: parseAtlasRiskLevel(properties),
        properties,
      },
    });
  }
  return out;
}

export type AtlasDriverInput = {
  kind: 'geojson_featurecollection';
  fc: unknown;
  riskType: string;
};

function toParseInput(input: AtlasDriverInput): ParseAtlasInput {
  if (input.kind !== 'geojson_featurecollection') {
    throw new Error('atlas_unknown_input_kind');
  }
  if (!isAtlasRiskType(input.riskType)) {
    throw new Error('atlas_invalid_risk_type');
  }
  const parsed = AtlasFeatureCollection.safeParse(input.fc);
  if (!parsed.success) throw new Error('atlas_invalid_geojson');
  return { fc: parsed.data, riskType: input.riskType };
}

export async function upsertAtlasRows(
  rows: AtlasParsedRow[],
  ctx: IngestCtx,
  validFrom: string,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: ATLAS_SOURCE,
    source_id: r.source_id,
    entity_type: r.entity_type,
    name: r.name,
    scian_code: r.scian_code,
    h3_r8: r.h3_r8,
    valid_from: validFrom,
    run_id: ctx.runId,
    meta: {
      ...r.meta,
      lat: r.lat,
      lng: r.lng,
    },
  }));
  const { error, count } = await supabase.from('geo_data_points').upsert(payload as never, {
    onConflict: 'country_code,source,source_id,valid_from',
    count: 'exact',
    ignoreDuplicates: false,
  });
  if (error) return { inserted: 0, errors: [`geo_data_points_upsert: ${error.message}`] };
  return { inserted: count ?? rows.length, errors: [] };
}

export const atlasDriver: IngestDriver<AtlasDriverInput, ParseAtlasInput> = {
  source: ATLAS_SOURCE,
  category: 'geo',
  defaultPeriodicity: ATLAS_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input) throw new Error('atlas_missing_input');
    return toParseInput(input);
  },
  async parse(payload) {
    return parseAtlasGeoJson(payload as ParseAtlasInput);
  },
  async upsert(rows, ctx) {
    const parsed = rows as AtlasParsedRow[];
    const { inserted, errors } = await upsertAtlasRows(parsed, ctx, todayISO());
    return {
      rows_inserted: inserted,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors,
      cost_estimated_usd: 0,
    };
  },
};

registerDriver(atlasDriver);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export interface IngestAtlasOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export interface IngestAtlasInput {
  fc: unknown;
  riskType: string;
}

export async function ingestAtlasRiesgos(
  input: IngestAtlasInput,
  options: IngestAtlasOptions = {},
): Promise<IngestResult> {
  if (!input || input.fc == null) throw new Error('atlas_missing_input');
  const parseInput = toParseInput({
    kind: 'geojson_featurecollection',
    fc: input.fc,
    riskType: input.riskType,
  });

  const periodEnd = todayISO();

  const job: IngestJob<ParseAtlasInput> = {
    source: ATLAS_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseAtlasGeoJson(parseInput);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<AtlasParsedRow>({ min: 0 }),
          geoValidityGateMx<AtlasParsedRow>(),
          duplicateDetectionGate<AtlasParsedRow>((r) => r.source_id),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertAtlasRows(parsed, ctx, periodEnd);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: ATLAS_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: ATLAS_UPSTREAM_URL,
              transformation: `atlas_geojson_parse:${parseInput.riskType}`,
              sourceSpan: {
                source_id: r.source_id,
                risk_type: r.meta.risk_type,
                risk_level: r.meta.risk_level,
              },
            })),
          );
        } catch {
          // lineage best-effort
        }
      }

      const meta: Record<string, unknown> = {
        quality_gate_warnings: gates.warnings,
        rows_parsed: parsed.length,
        risk_type: parseInput.riskType,
      };
      if (options.uploadedBy) meta.uploaded_by = options.uploadedBy;

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: 0,
        meta,
        rawPayload: parseInput,
      };
    },
  };

  const runOpts: RunIngestOptions = {
    saveRaw: options.saveRaw ?? true,
    bumpWatermarkOnSuccess: { periodEnd },
  };
  if (typeof options.retries === 'number') runOpts.retries = options.retries;

  return await runIngest(job, runOpts);
}
