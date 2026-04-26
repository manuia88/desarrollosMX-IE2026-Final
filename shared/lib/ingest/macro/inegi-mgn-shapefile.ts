// F1.C.C Tier 2 Demographics — INEGI Marco Geoestadístico shapefile parser
//
// Descarga el ZIP MGN CDMX (entidad 09, ~83 MB) desde INEGI BVINEGI catálogo
// 889463807469 y extrae la capa 09a (AGEB urbanos) como GeoJSON
// FeatureCollection en EPSG:4326 (post-shpjs reprojection desde EPSG:6372
// nativo ITRF2008 LCC).
//
// shpjs auto-reproyecta via proj4js bundled (lee .prj) — no manual proj4
// registration needed. Memory peak ~350-400 MB para 83 MB ZIP + ~2,400 AGEBs.
// Cron job recomendado: NODE_OPTIONS=--max-old-space-size=2048.
//
// Refs: SA-MGN-Shapefile-Parser-Research.md
//       https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=889463807469

import shp from 'shpjs';

export const MGN_CDMX_ZIP_URL =
  'https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/marcogeo/889463807469/09_ciudaddemexico.zip';

const CDMX_BBOX = {
  lng_min: -99.4,
  lng_max: -98.9,
  lat_min: 19.0,
  lat_max: 19.6,
} as const;

export type AgebFeatureProperties = {
  CVE_ENT: string;
  CVE_MUN: string;
  CVE_LOC: string;
  CVE_AGEB: string;
  CVEGEO?: string;
  Ambito?: string;
};

export type AgebFeature = {
  type: 'Feature';
  properties: AgebFeatureProperties;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

export type AgebFeatureCollection = {
  type: 'FeatureCollection';
  features: AgebFeature[];
  fileName?: string;
};

/**
 * Descarga ZIP MGN CDMX y retorna ArrayBuffer.
 * Cache local opcional via fs.writeFile en cacheDir.
 */
export async function downloadMgnZip(zipUrl: string = MGN_CDMX_ZIP_URL): Promise<ArrayBuffer> {
  const res = await fetch(zipUrl);
  if (!res.ok) {
    throw new Error(`[mgn-shapefile] download failed HTTP ${res.status} url=${zipUrl}`);
  }
  return await res.arrayBuffer();
}

/**
 * Extrae capa 09a (AGEB urbano) del ZIP MGN CDMX. shpjs procesa todas las
 * capas (~10 .shp) y devuelve array de FeatureCollections — filtro por
 * fileName === '09a'.
 *
 * Sanity check: validate first feature coords están dentro CDMX bbox para
 * detectar reprojection errors.
 */
export async function extractAgebLayer(zipBuffer: ArrayBuffer): Promise<AgebFeatureCollection> {
  const result = await shp(zipBuffer);
  const collections = Array.isArray(result) ? result : [result];

  const ageb = collections.find((fc) => {
    if (typeof fc !== 'object' || fc === null || !('fileName' in fc)) return false;
    const name = (fc as { fileName?: string }).fileName ?? '';
    // INEGI MGN ZIPs nest layers in 'conjunto_de_datos/' directory.
    // shpjs returns fileName like 'conjunto_de_datos/09a' or just '09a'.
    // Match basename === '09a' (NOT '09ar' urban rural).
    const basename = name.split('/').pop() ?? '';
    return basename === '09a';
  }) as unknown as AgebFeatureCollection | undefined;

  if (!ageb) {
    const fileNames = collections
      .map((fc) =>
        typeof fc === 'object' && fc !== null && 'fileName' in fc
          ? (fc as { fileName?: string }).fileName
          : '?',
      )
      .filter(Boolean)
      .join(', ');
    throw new Error(`[mgn-shapefile] required 09a.shp not found in ZIP layers: [${fileNames}]`);
  }

  if (ageb.features.length === 0) {
    throw new Error(
      '[mgn-shapefile] invalid empty features array, expected AGEB polygons missing from 09a.shp',
    );
  }

  // Sanity check: first feature centroid should be within CDMX bbox
  const firstFeat = ageb.features[0];
  if (!firstFeat) {
    throw new Error(
      '[mgn-shapefile] required features[0] is missing despite length > 0 — invalid parser state',
    );
  }
  const coords =
    firstFeat.geometry.type === 'Polygon'
      ? firstFeat.geometry.coordinates[0]?.[0]
      : firstFeat.geometry.coordinates[0]?.[0]?.[0];

  if (!coords || coords.length < 2) {
    throw new Error('[mgn-shapefile] cannot extract first feature coords for bbox validation');
  }

  const [lng, lat] = coords as [number, number];
  if (
    lng < CDMX_BBOX.lng_min ||
    lng > CDMX_BBOX.lng_max ||
    lat < CDMX_BBOX.lat_min ||
    lat > CDMX_BBOX.lat_max
  ) {
    throw new Error(
      `[mgn-shapefile] reprojection sanity check FAILED: first feature coord (${lng}, ${lat}) outside CDMX bbox. Native EPSG:6372 → 4326 reprojection may have failed.`,
    );
  }

  return ageb;
}

/**
 * Normaliza propiedades AGEB: forza CVE_* a strings padded (canon LPAD
 * defensiva). MGN .dbf devuelve CVE_AGEB hex como string ya — reasegurar.
 */
export function normalizeAgebProperties(fc: AgebFeatureCollection): AgebFeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        CVE_ENT: String(f.properties.CVE_ENT ?? '').padStart(2, '0'),
        CVE_MUN: String(f.properties.CVE_MUN ?? '').padStart(3, '0'),
        CVE_LOC: String(f.properties.CVE_LOC ?? '').padStart(4, '0'),
        CVE_AGEB: String(f.properties.CVE_AGEB ?? '').padStart(4, '0'),
      },
    })),
  };
}

/**
 * Builds composite 13-char join key (CVE_ENT || CVE_MUN || CVE_LOC || CVE_AGEB).
 * Used to JOIN GeoJSON features × RESAGEBURB CSV rows.
 */
export function agebJoinKey(props: AgebFeatureProperties): string {
  return `${props.CVE_ENT}${props.CVE_MUN}${props.CVE_LOC}${props.CVE_AGEB}`;
}
