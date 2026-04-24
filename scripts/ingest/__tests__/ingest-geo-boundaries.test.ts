import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildBboxPolygon500m,
  buildMetadataForBoundary,
  computeH3R8,
  loadRealBoundaryEwktIfExists,
} from '../01_ingest-geo-boundaries.ts';

describe('buildBboxPolygon500m', () => {
  it('es determinista: mismo lat/lng produce mismo ewkt y areaKm2', () => {
    const a = buildBboxPolygon500m(19.4326, -99.1332);
    const b = buildBboxPolygon500m(19.4326, -99.1332);
    expect(a.ewkt).toBe(b.ewkt);
    expect(a.areaKm2).toBe(b.areaKm2);
    expect(a.centroid).toEqual(b.centroid);
  });

  it('formato EWKT correcto: SRID=4326;MULTIPOLYGON((( con 5 coords incluido cierre', () => {
    const built = buildBboxPolygon500m(19.4326, -99.1332);
    expect(built.ewkt.startsWith('SRID=4326;MULTIPOLYGON(((')).toBe(true);
    expect(built.ewkt.endsWith(')))')).toBe(true);

    const inner = built.ewkt.slice('SRID=4326;MULTIPOLYGON((('.length, built.ewkt.length - 3);
    const points = inner.split(', ');
    expect(points.length).toBe(5);

    // Primer y último punto iguales (cierre)
    expect(points[0]).toBe(points[4]);
  });

  it('areaKm2 razonable (~0.23..0.30 km²) a latitudes CDMX', () => {
    const built = buildBboxPolygon500m(19.4, -99.1661);
    expect(built.areaKm2).toBeGreaterThan(0.23);
    expect(built.areaKm2).toBeLessThan(0.3);
  });

  it('areaKm2 > 0 y polygon cerrado (primer == último punto)', () => {
    const built = buildBboxPolygon500m(19.4, -99.1661);
    expect(built.areaKm2).toBeGreaterThan(0);

    const inner = built.ewkt.slice('SRID=4326;MULTIPOLYGON((('.length, built.ewkt.length - 3);
    const points = inner.split(', ');
    expect(points[0]).toBe(points[points.length - 1]);
  });
});

describe('buildMetadataForBoundary', () => {
  it('mergea con metadata existente sin borrar keys', () => {
    const existing = { foo: 'bar', nested: { k: 1 }, boundary_source: 'stale' };
    const merged = buildMetadataForBoundary('fallback:bbox-500m', existing);
    expect(merged.foo).toBe('bar');
    expect(merged.nested).toEqual({ k: 1 });
    // boundary_source debe ser sobrescrito con el valor nuevo
    expect(merged.boundary_source).toBe('fallback:bbox-500m');
  });

  it('añade boundary_source y boundary_added_at (ISO 8601)', () => {
    const merged = buildMetadataForBoundary('real:file', {});
    expect(merged.boundary_source).toBe('real:file');
    const addedAt = merged.boundary_added_at;
    expect(typeof addedAt).toBe('string');
    // ISO 8601: parseable por Date y con 'T' + 'Z'/offset
    const parsed = new Date(addedAt as string);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect((addedAt as string).includes('T')).toBe(true);
  });
});

describe('computeH3R8', () => {
  it('devuelve string hex de 15 chars para lat/lng CDMX', () => {
    const h3 = computeH3R8(19.4, -99.1661);
    expect(typeof h3).toBe('string');
    expect(h3.length).toBe(15);
    // H3 cells son hex lowercase
    expect(/^[0-9a-f]{15}$/.test(h3)).toBe(true);
  });

  it('es determinista para mismo input', () => {
    const a = computeH3R8(19.4326, -99.1332);
    const b = computeH3R8(19.4326, -99.1332);
    expect(a).toBe(b);
  });
});

describe('loadRealBoundaryEwktIfExists', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingest-geo-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('retorna null si el archivo no existe', async () => {
    const out = await loadRealBoundaryEwktIfExists('colonia-inexistente', tmpDir);
    expect(out).toBeNull();
  });

  it('parsea FeatureCollection con Polygon válido → EWKT SRID=4326', async () => {
    const scopeId = 'roma-norte';
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-99.17, 19.41],
                [-99.16, 19.41],
                [-99.16, 19.42],
                [-99.17, 19.42],
                [-99.17, 19.41],
              ],
            ],
          },
          properties: {},
        },
      ],
    };
    const file = path.join(tmpDir, `${scopeId}.geojson`);
    await fs.writeFile(file, JSON.stringify(fc), 'utf8');

    const out = await loadRealBoundaryEwktIfExists(scopeId, tmpDir);
    expect(out).not.toBeNull();
    if (out == null) return; // type narrowing

    expect(out.ewkt.startsWith('SRID=4326;MULTIPOLYGON(((')).toBe(true);
    expect(out.ewkt).toContain('-99.17 19.41');
    expect(out.ewkt).toContain('-99.16 19.42');
    expect(out.areaKm2).toBeGreaterThan(0);
    // Centroide dentro del bbox
    expect(out.centroid[0]).toBeGreaterThan(-99.17);
    expect(out.centroid[0]).toBeLessThan(-99.16);
    expect(out.centroid[1]).toBeGreaterThan(19.41);
    expect(out.centroid[1]).toBeLessThan(19.42);
  });
});
