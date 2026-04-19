import { describe, expect, it } from 'vitest';
import {
  categorizeFgjDelito,
  FGJ_CRIME_CATEGORIES,
  FGJ_HEADER_MAP,
  FGJ_PERIODICITY,
  FGJ_SOURCE,
  fgjDriver,
  normalizeHeader,
  parseCsvLine,
  parseFgjDate,
  parseFgjPayload,
} from '../fgj';

describe('FGJ_CRIME_CATEGORIES', () => {
  it('expone las 8 categorías normalizadas', () => {
    expect(FGJ_CRIME_CATEGORIES).toEqual([
      'robo_vivienda',
      'robo_vehiculo',
      'violencia_familiar',
      'homicidio',
      'lesiones',
      'narcomenudeo',
      'fraude',
      'otros',
    ]);
  });
});

describe('normalizeHeader', () => {
  it('quita acentos, lowercase y colapsa separadores', () => {
    expect(normalizeHeader('Año Hechos')).toBe('ano_hechos');
    expect(normalizeHeader('  ALCALDÍA  ')).toBe('alcaldia');
    expect(normalizeHeader('Categoría_Delito')).toBe('categoria_delito');
  });
});

describe('FGJ_HEADER_MAP', () => {
  it('mapea variantes de fecha / delito / alcaldía', () => {
    expect(FGJ_HEADER_MAP.fecha_hechos).toBe('fecha_hechos');
    expect(FGJ_HEADER_MAP.fecha).toBe('fecha_hechos');
    expect(FGJ_HEADER_MAP.tipo_delito).toBe('delito');
    expect(FGJ_HEADER_MAP.municipio).toBe('alcaldia_hechos');
    expect(FGJ_HEADER_MAP.lat).toBe('latitud');
    expect(FGJ_HEADER_MAP.lng).toBe('longitud');
    expect(FGJ_HEADER_MAP.carpeta_investigacion).toBe('id_carpeta');
  });
});

describe('categorizeFgjDelito', () => {
  it('detecta robo_vivienda por "casa habitacion" o "vivienda"', () => {
    expect(categorizeFgjDelito('ROBO A CASA HABITACION CON VIOLENCIA')).toBe('robo_vivienda');
    expect(categorizeFgjDelito('robo a vivienda sin violencia')).toBe('robo_vivienda');
  });

  it('detecta robo_vehiculo por vehiculo/automovil/coche', () => {
    expect(categorizeFgjDelito('ROBO DE VEHICULO CON VIOLENCIA')).toBe('robo_vehiculo');
    expect(categorizeFgjDelito('Robo de automóvil')).toBe('robo_vehiculo');
    expect(categorizeFgjDelito('robo de coche sin violencia')).toBe('robo_vehiculo');
  });

  it('detecta violencia_familiar', () => {
    expect(categorizeFgjDelito('VIOLENCIA FAMILIAR')).toBe('violencia_familiar');
  });

  it('detecta homicidio (doloso y culposo)', () => {
    expect(categorizeFgjDelito('HOMICIDIO DOLOSO')).toBe('homicidio');
    expect(categorizeFgjDelito('Homicidio Culposo')).toBe('homicidio');
  });

  it('detecta lesiones', () => {
    expect(categorizeFgjDelito('LESIONES DOLOSAS')).toBe('lesiones');
    expect(categorizeFgjDelito('Lesión culposa')).toBe('lesiones');
  });

  it('detecta narcomenudeo / drogas', () => {
    expect(categorizeFgjDelito('NARCOMENUDEO POSESION')).toBe('narcomenudeo');
    expect(categorizeFgjDelito('Posesión de drogas')).toBe('narcomenudeo');
  });

  it('detecta fraude', () => {
    expect(categorizeFgjDelito('FRAUDE GENERICO')).toBe('fraude');
  });

  it('fallback otros para delitos no mapeados o string vacío', () => {
    expect(categorizeFgjDelito('ALLANAMIENTO DE MORADA')).toBe('otros');
    expect(categorizeFgjDelito('')).toBe('otros');
    expect(categorizeFgjDelito('  ')).toBe('otros');
  });
});

describe('parseFgjDate', () => {
  it('parsea YYYY-MM-DD', () => {
    expect(parseFgjDate('2024-06-15')).toBe('2024-06-15');
  });

  it('parsea DD/MM/YYYY', () => {
    expect(parseFgjDate('15/06/2024')).toBe('2024-06-15');
  });

  it('parsea YYYY/MM/DD', () => {
    expect(parseFgjDate('2024/06/15')).toBe('2024-06-15');
  });

  it('parsea DD-MM-YYYY', () => {
    expect(parseFgjDate('15-06-2024')).toBe('2024-06-15');
  });

  it('regresa null para formato inválido o null', () => {
    expect(parseFgjDate('abc')).toBeNull();
    expect(parseFgjDate('')).toBeNull();
    expect(parseFgjDate(null)).toBeNull();
    expect(parseFgjDate('2024-13-01')).toBeNull();
    expect(parseFgjDate('32/06/2024')).toBeNull();
  });
});

describe('parseCsvLine', () => {
  it('respeta comillas con comas internas', () => {
    expect(parseCsvLine('"a,b",c,"d,e"')).toEqual(['a,b', 'c', 'd,e']);
  });

  it('maneja campos vacíos', () => {
    expect(parseCsvLine(',a,,b')).toEqual(['', 'a', '', 'b']);
  });
});

describe('parseFgjPayload — CSV', () => {
  const csv = [
    'ao_hechos,mes_hechos,fecha_hechos,delito,categoria_delito,alcaldia_hechos,colonia_hechos,latitud,longitud',
    '2024,6,2024-06-15,ROBO A CASA HABITACION CON VIOLENCIA,DELITO DE ALTO IMPACTO,COYOACAN,DEL CARMEN,19.3467,-99.1619',
    '2024,6,2024-06-16,ROBO DE VEHICULO SIN VIOLENCIA,DELITO DE BAJO IMPACTO,BENITO JUAREZ,NARVARTE,19.3910,-99.1570',
    '2024,6,2024-06-17,VIOLENCIA FAMILIAR,,IZTAPALAPA,SANTA MARTHA,19.3589,-99.0482',
    '2024,6,2024-06-18,HOMICIDIO DOLOSO,DELITO DE ALTO IMPACTO,GUSTAVO A MADERO,LINDAVISTA,,',
  ].join('\n');

  it('parsea 4 rows con categorías correctas', () => {
    const rows = parseFgjPayload({ kind: 'csv', text: csv });
    expect(rows.length).toBe(4);
    expect(rows[0]?.meta.categoria_normalizada).toBe('robo_vivienda');
    expect(rows[1]?.meta.categoria_normalizada).toBe('robo_vehiculo');
    expect(rows[2]?.meta.categoria_normalizada).toBe('violencia_familiar');
    expect(rows[3]?.meta.categoria_normalizada).toBe('homicidio');
  });

  it('computa h3_r8 solo con coords válidas', () => {
    const rows = parseFgjPayload({ kind: 'csv', text: csv });
    expect(rows[0]?.h3_r8).not.toBeNull();
    expect(rows[0]?.lat).toBeCloseTo(19.3467, 3);
    expect(rows[0]?.lng).toBeCloseTo(-99.1619, 3);
    // Row 3 sin coords → h3_r8 null, incluida en output.
    expect(rows[3]?.h3_r8).toBeNull();
    expect(rows[3]?.lat).toBeNull();
    expect(rows[3]?.lng).toBeNull();
  });

  it('meta persiste delito_raw, alcaldia, colonia, ao, mes', () => {
    const rows = parseFgjPayload({ kind: 'csv', text: csv });
    const first = rows[0];
    expect(first?.meta.delito_raw).toBe('ROBO A CASA HABITACION CON VIOLENCIA');
    expect(first?.meta.alcaldia).toBe('COYOACAN');
    expect(first?.meta.colonia).toBe('DEL CARMEN');
    expect(first?.meta.ao_hechos).toBe(2024);
    expect(first?.meta.mes_hechos).toBe(6);
    expect(first?.meta.fecha_hechos).toBe('2024-06-15');
  });

  it('source_id = hash fallback cuando no hay id_carpeta', () => {
    const rows = parseFgjPayload({ kind: 'csv', text: csv });
    for (const r of rows) {
      expect(r?.source_id).toMatch(/^fgj_[0-9a-f]{8}$/);
    }
  });

  it('usa id_carpeta como source_id cuando está presente', () => {
    const csvWithId = [
      'id_carpeta,fecha_hechos,delito,alcaldia_hechos,colonia_hechos,latitud,longitud',
      'CI-FGJ-001/2024-06,2024-06-15,ROBO A CASA HABITACION,COYOACAN,DEL CARMEN,19.3467,-99.1619',
    ].join('\n');
    const rows = parseFgjPayload({ kind: 'csv', text: csvWithId });
    expect(rows[0]?.source_id).toBe('CI-FGJ-001/2024-06');
  });

  it('entity_type=crime_incident y scian_code=null', () => {
    const rows = parseFgjPayload({ kind: 'csv', text: csv });
    expect(rows[0]?.entity_type).toBe('crime_incident');
    expect(rows[0]?.scian_code).toBeNull();
  });

  it('lanza error si faltan headers requeridos', () => {
    const bad = ['foo,bar', '1,2'].join('\n');
    expect(() => parseFgjPayload({ kind: 'csv', text: bad })).toThrow(
      'fgj_csv_headers_not_recognized',
    );
  });

  it('CSV vacío regresa []', () => {
    expect(parseFgjPayload({ kind: 'csv', text: '' })).toEqual([]);
    expect(parseFgjPayload({ kind: 'csv', text: '   ' })).toEqual([]);
  });

  it('quality gate dedup: misma carpeta dos veces → duplicates detectados por natural key', () => {
    const csvDup = [
      'id_carpeta,fecha_hechos,delito,alcaldia_hechos,colonia_hechos,latitud,longitud',
      'CI-001,2024-06-15,ROBO A CASA HABITACION,COYOACAN,DEL CARMEN,19.3467,-99.1619',
      'CI-001,2024-06-15,ROBO A CASA HABITACION,COYOACAN,DEL CARMEN,19.3467,-99.1619',
    ].join('\n');
    const rows = parseFgjPayload({ kind: 'csv', text: csvDup });
    expect(rows.length).toBe(2);
    // Natural key idéntico → dedup gate detectaría 1 duplicate.
    const keys = rows.map((r) => `${r.source_id}:${r.valid_from}`);
    expect(new Set(keys).size).toBe(1);
  });
});

describe('parseFgjPayload — JSON', () => {
  it('parsea array de objetos con coords numéricas', () => {
    const json = [
      {
        ao_hechos: 2024,
        mes_hechos: 6,
        fecha_hechos: '2024-06-15',
        delito: 'ROBO DE VEHICULO CON VIOLENCIA',
        alcaldia_hechos: 'COYOACAN',
        colonia_hechos: 'DEL CARMEN',
        latitud: 19.3467,
        longitud: -99.1619,
      },
      {
        ao_hechos: 2024,
        mes_hechos: 6,
        fecha_hechos: '2024-06-16',
        delito: 'HOMICIDIO DOLOSO',
        alcaldia_hechos: 'IZTAPALAPA',
        colonia_hechos: 'SANTA MARTHA',
        latitud: 19.3589,
        longitud: -99.0482,
      },
    ];
    const rows = parseFgjPayload({ kind: 'json', rows: json });
    expect(rows.length).toBe(2);
    expect(rows[0]?.meta.categoria_normalizada).toBe('robo_vehiculo');
    expect(rows[1]?.meta.categoria_normalizada).toBe('homicidio');
    expect(rows[0]?.lat).toBeCloseTo(19.3467, 3);
    expect(rows[0]?.lng).toBeCloseTo(-99.1619, 3);
    expect(rows[0]?.h3_r8).not.toBeNull();
  });

  it('JSON vacío regresa []', () => {
    expect(parseFgjPayload({ kind: 'json', rows: [] })).toEqual([]);
  });

  it('lanza error si JSON no mapea headers requeridos', () => {
    const bad = [{ foo: 1, bar: 2 }];
    expect(() => parseFgjPayload({ kind: 'json', rows: bad })).toThrow(
      'fgj_json_headers_not_recognized',
    );
  });
});

describe('fgjDriver', () => {
  it('registrado con source=fgj, category=geo, defaultPeriodicity=weekly', () => {
    expect(fgjDriver.source).toBe(FGJ_SOURCE);
    expect(fgjDriver.category).toBe('geo');
    expect(fgjDriver.defaultPeriodicity).toBe(FGJ_PERIODICITY);
    expect(FGJ_PERIODICITY).toBe('weekly');
  });

  it('fetch acepta csvText y regresa parseInput.kind=csv', async () => {
    const ctx = {
      runId: 'r',
      source: FGJ_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'fecha_hechos,delito\n2024-06-15,ROBO';
    const out = await fgjDriver.fetch(ctx, { csvText: csv });
    expect(out.kind).toBe('csv');
  });

  it('fetch acepta json y regresa parseInput.kind=json', async () => {
    const ctx = {
      runId: 'r',
      source: FGJ_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const out = await fgjDriver.fetch(ctx, {
      json: [{ fecha_hechos: '2024-06-15', delito: 'ROBO' }],
    });
    expect(out.kind).toBe('json');
  });

  it('fetch rechaza csvText vacío', async () => {
    const ctx = {
      runId: 'r',
      source: FGJ_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(fgjDriver.fetch(ctx, { csvText: '' })).rejects.toThrow('fgj_missing_payload');
  });
});
