import { describe, expect, it } from 'vitest';
import {
  GTFS_HEADERS_ROUTES,
  GTFS_HEADERS_STOPS,
  GTFS_PERIODICITY,
  GTFS_SOURCE,
  gtfsDriver,
  parseCsvLine,
  parseGtfsRoutesCsv,
  parseGtfsStopsCsv,
  slugifySystemName,
} from '../gtfs';

describe('slugifySystemName', () => {
  it('slugifica nombres de sistemas MX conocidos', () => {
    expect(slugifySystemName('Metro CDMX')).toBe('metro_cdmx');
    expect(slugifySystemName('Metrobús')).toBe('metrobus');
    expect(slugifySystemName('Tren Suburbano')).toBe('tren_suburbano');
    expect(slugifySystemName('Cablebús')).toBe('cablebus');
    expect(slugifySystemName('EcoBici')).toBe('ecobici');
  });

  it('tolera espacios edge y puntuación', () => {
    expect(slugifySystemName('  Metro  CDMX  ')).toBe('metro_cdmx');
    expect(slugifySystemName('Metro-CDMX.v2')).toBe('metro_cdmx_v2');
  });

  it('regresa string vacío para input vacío/inválido', () => {
    expect(slugifySystemName('')).toBe('');
    expect(slugifySystemName('   ')).toBe('');
  });
});

describe('parseCsvLine', () => {
  it('respeta comillas con comas internas', () => {
    expect(parseCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
  });

  it('soporta comillas escapadas ""', () => {
    expect(parseCsvLine('"he said ""hi""",x')).toEqual(['he said "hi"', 'x']);
  });
});

describe('parseGtfsStopsCsv — happy path', () => {
  const csv = [
    'stop_id,stop_name,stop_lat,stop_lon,parent_station,location_type,zone_id',
    'M01,Pantitlán,19.4147,-99.0728,,0,Z1',
    'M02,"Zócalo, Centro",19.4326,-99.1332,,0,Z2',
    'M03,Tasqueña,19.3436,-99.1389,,0,Z3',
  ].join('\n');

  it('emite 3 rows con entity_type=transit_stop', () => {
    const rows = parseGtfsStopsCsv(csv, 'Metro CDMX');
    expect(rows.length).toBe(3);
    for (const r of rows) {
      expect(r.entity_type).toBe('transit_stop');
    }
  });

  it('source_id = <system_slug>:<stop_id>', () => {
    const rows = parseGtfsStopsCsv(csv, 'Metro CDMX');
    expect(rows[0]?.source_id).toBe('metro_cdmx:M01');
    expect(rows[1]?.source_id).toBe('metro_cdmx:M02');
    expect(rows[2]?.source_id).toBe('metro_cdmx:M03');
  });

  it('meta.system_name y stop_id_raw se preservan', () => {
    const rows = parseGtfsStopsCsv(csv, 'Metro CDMX');
    const first = rows[0];
    expect(first?.meta.system_name).toBe('Metro CDMX');
    expect(first?.meta.system_slug).toBe('metro_cdmx');
    expect(first?.meta.stop_id_raw).toBe('M01');
    expect(first?.meta.gtfs_zone_id).toBe('Z1');
    expect(first?.meta.location_type).toBe(0);
  });

  it('h3_r8 se computa para coords válidas MX', () => {
    const rows = parseGtfsStopsCsv(csv, 'Metro CDMX');
    for (const r of rows) {
      expect(typeof r.h3_r8).toBe('string');
      expect(r.h3_r8?.length).toBeGreaterThan(0);
    }
  });

  it('respeta comillas con comas internas en stop_name', () => {
    const rows = parseGtfsStopsCsv(csv, 'Metro CDMX');
    expect(rows[1]?.name).toBe('Zócalo, Centro');
  });
});

describe('parseGtfsStopsCsv — filtros y errores', () => {
  it('filtra stops con lat/lng inválidos o vacíos', () => {
    const csv = [
      'stop_id,stop_name,stop_lat,stop_lon',
      'A,Valid,19.4,-99.1',
      'B,NoLat,,-99.1',
      'C,NoLng,19.4,',
      'D,Invalid,abc,xyz',
      'E,AlsoValid,19.5,-99.2',
    ].join('\n');
    const rows = parseGtfsStopsCsv(csv, 'Metrobús');
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.meta.stop_id_raw).sort()).toEqual(['A', 'E']);
  });

  it('filtra stops con stop_id vacío', () => {
    const csv = [
      'stop_id,stop_name,stop_lat,stop_lon',
      ',Empty,19.4,-99.1',
      'X,Ok,19.4,-99.1',
    ].join('\n');
    const rows = parseGtfsStopsCsv(csv, 'Metrobús');
    expect(rows.length).toBe(1);
    expect(rows[0]?.source_id).toBe('metrobus:X');
  });

  it('lanza gtfs_stops_headers_missing si falta columna obligatoria', () => {
    const csv = ['stop_id,stop_name,stop_lat', 'X,Y,19.4'].join('\n');
    expect(() => parseGtfsStopsCsv(csv, 'Metro CDMX')).toThrow('gtfs_stops_headers_missing');
  });

  it('CSV vacío → []', () => {
    expect(parseGtfsStopsCsv('', 'Metro CDMX')).toEqual([]);
    expect(parseGtfsStopsCsv('   ', 'Metro CDMX')).toEqual([]);
  });

  it('tolera BOM y CRLF', () => {
    const csv =
      '\uFEFFstop_id,stop_name,stop_lat,stop_lon\r\nA1,Test,19.4,-99.1\r\nA2,Test2,19.5,-99.2\r\n';
    const rows = parseGtfsStopsCsv(csv, 'EcoBici');
    expect(rows.length).toBe(2);
  });
});

describe('parseGtfsRoutesCsv', () => {
  it('parsea routes básicas', () => {
    const csv = [
      'route_id,route_short_name,route_long_name,route_type',
      'L1,1,Línea 1 Rosa,1',
      'L2,2,Línea 2 Azul,1',
    ].join('\n');
    const rows = parseGtfsRoutesCsv(csv, 'Metro CDMX');
    expect(rows.length).toBe(2);
    expect(rows[0]?.route_id).toBe('L1');
    expect(rows[0]?.route_short_name).toBe('1');
    expect(rows[0]?.route_long_name).toBe('Línea 1 Rosa');
    expect(rows[0]?.route_type).toBe(1);
    expect(rows[0]?.meta.system_slug).toBe('metro_cdmx');
  });

  it('lanza gtfs_routes_headers_missing si faltan columnas', () => {
    const csv = ['route_id,route_short_name', 'L1,1'].join('\n');
    expect(() => parseGtfsRoutesCsv(csv, 'Metro CDMX')).toThrow('gtfs_routes_headers_missing');
  });

  it('descarta rows con route_type inválido o route_id vacío', () => {
    const csv = ['route_id,route_type', 'L1,1', ',3', 'L2,abc', 'L3,0'].join('\n');
    const rows = parseGtfsRoutesCsv(csv, 'Metrobús');
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.route_id).sort()).toEqual(['L1', 'L3']);
  });
});

describe('GTFS_HEADERS constants', () => {
  it('GTFS_HEADERS_STOPS incluye columnas obligatorias spec', () => {
    expect(GTFS_HEADERS_STOPS).toContain('stop_id');
    expect(GTFS_HEADERS_STOPS).toContain('stop_name');
    expect(GTFS_HEADERS_STOPS).toContain('stop_lat');
    expect(GTFS_HEADERS_STOPS).toContain('stop_lon');
  });

  it('GTFS_HEADERS_ROUTES incluye route_id y route_type', () => {
    expect(GTFS_HEADERS_ROUTES).toContain('route_id');
    expect(GTFS_HEADERS_ROUTES).toContain('route_type');
  });
});

describe('gtfsDriver', () => {
  const mkCtx = () => ({
    runId: 'test-run',
    source: GTFS_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: null,
    startedAt: new Date(),
  });

  it('está registrado con source=gtfs, category=geo, periodicity=quarterly', () => {
    expect(gtfsDriver.source).toBe('gtfs');
    expect(gtfsDriver.category).toBe('geo');
    expect(gtfsDriver.defaultPeriodicity).toBe(GTFS_PERIODICITY);
  });

  it('fetch dispatches pre_extracted → parsea stops', async () => {
    const ctx = mkCtx();
    const stopsCsv = [
      'stop_id,stop_name,stop_lat,stop_lon',
      'MB01,Indios Verdes,19.4948,-99.1191',
      'MB02,Deportivo 18 Marzo,19.4870,-99.1306',
    ].join('\n');
    const payload = await gtfsDriver.fetch(ctx, {
      kind: 'pre_extracted',
      stopsCsv,
      systemName: 'Metrobús',
    });
    expect(payload.stops.length).toBe(2);
    expect(payload.systemSlug).toBe('metrobus');
    expect(payload.routes.length).toBe(0);
  });

  it('fetch dispatches zip_buffer → throws (H1 no soporta ZIP extraction)', async () => {
    const ctx = mkCtx();
    await expect(
      gtfsDriver.fetch(ctx, {
        kind: 'zip_buffer',
        zipBuffer: Buffer.from('fake'),
        systemName: 'Metro CDMX',
      }),
    ).rejects.toThrow('gtfs_zip_extraction_not_supported');
  });

  it('fetch rechaza input ausente / systemName vacío / stopsCsv vacío', async () => {
    const ctx = mkCtx();
    await expect(
      gtfsDriver.fetch(ctx, {
        kind: 'pre_extracted',
        stopsCsv: 'stop_id,stop_name,stop_lat,stop_lon\nA,B,19.4,-99.1',
        systemName: '',
      }),
    ).rejects.toThrow('gtfs_missing_system_name');
    await expect(
      gtfsDriver.fetch(ctx, {
        kind: 'pre_extracted',
        stopsCsv: '',
        systemName: 'Metro CDMX',
      }),
    ).rejects.toThrow('gtfs_missing_stops_csv');
  });

  it('parse emite stops (routes NO se persiste en H1)', async () => {
    const ctx = mkCtx();
    const stopsCsv = ['stop_id,stop_name,stop_lat,stop_lon', 'A,Test,19.4,-99.1'].join('\n');
    const routesCsv = ['route_id,route_type', 'L1,1'].join('\n');
    const payload = await gtfsDriver.fetch(ctx, {
      kind: 'pre_extracted',
      stopsCsv,
      routesCsv,
      systemName: 'Metro CDMX',
    });
    expect(payload.routes.length).toBe(1);
    const rows = await gtfsDriver.parse(payload, ctx);
    expect(rows.length).toBe(1);
  });
});
