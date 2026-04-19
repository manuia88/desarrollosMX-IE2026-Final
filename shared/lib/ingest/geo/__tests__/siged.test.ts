import { describe, expect, it } from 'vitest';
import {
  normalizeHeader,
  parseCsvLine,
  parseSigedCsv,
  parseSigedNivel,
  SIGED_HEADER_MAP,
  SIGED_NIVEL_CANONICAL,
  SIGED_PERIODICITY,
  SIGED_SOURCE,
  sigedDriver,
} from '../siged';

describe('SIGED_NIVEL_CANONICAL', () => {
  it('expone los 6 niveles canónicos', () => {
    expect(SIGED_NIVEL_CANONICAL).toEqual([
      'preescolar',
      'primaria',
      'secundaria',
      'media_superior',
      'superior',
      'otros',
    ]);
  });
});

describe('parseSigedNivel', () => {
  it('detecta preescolar (incluye kinder/inicial)', () => {
    expect(parseSigedNivel('PREESCOLAR')).toBe('preescolar');
    expect(parseSigedNivel('Kinder')).toBe('preescolar');
    expect(parseSigedNivel('educación inicial')).toBe('preescolar');
  });

  it('detecta primaria', () => {
    expect(parseSigedNivel('PRIMARIA')).toBe('primaria');
    expect(parseSigedNivel('Primaria General')).toBe('primaria');
  });

  it('detecta secundaria (incluye telesecundaria)', () => {
    expect(parseSigedNivel('SECUNDARIA')).toBe('secundaria');
    expect(parseSigedNivel('Telesecundaria')).toBe('secundaria');
  });

  it('detecta media superior (bachillerato/prepa/cetis/etc.)', () => {
    expect(parseSigedNivel('MEDIA SUPERIOR')).toBe('media_superior');
    expect(parseSigedNivel('Bachillerato')).toBe('media_superior');
    expect(parseSigedNivel('Preparatoria')).toBe('media_superior');
    expect(parseSigedNivel('CETIS')).toBe('media_superior');
    expect(parseSigedNivel('Conalep')).toBe('media_superior');
  });

  it('detecta superior (universidad/licenciatura/tecnológico/normal)', () => {
    expect(parseSigedNivel('SUPERIOR')).toBe('superior');
    expect(parseSigedNivel('Universidad')).toBe('superior');
    expect(parseSigedNivel('Licenciatura')).toBe('superior');
    expect(parseSigedNivel('Tecnológico')).toBe('superior');
    expect(parseSigedNivel('Normal')).toBe('superior');
  });

  it('fallback a otros para niveles desconocidos o vacío', () => {
    expect(parseSigedNivel('CAPACITACION PARA EL TRABAJO')).toBe('otros');
    expect(parseSigedNivel('')).toBe('otros');
    expect(parseSigedNivel(null)).toBe('otros');
    expect(parseSigedNivel(undefined)).toBe('otros');
  });

  it('media_superior antes de superior (evita false match)', () => {
    // "Media superior" contiene "superior" pero debe resolver a media_superior.
    expect(parseSigedNivel('Educación Media Superior')).toBe('media_superior');
  });
});

describe('normalizeHeader', () => {
  it('quita acentos, lowercase, colapsa separadores', () => {
    expect(normalizeHeader('Clave CT')).toBe('clave_ct');
    expect(normalizeHeader('ENTIDAD FEDERATIVA')).toBe('entidad_federativa');
    expect(normalizeHeader('  delegación ')).toBe('delegacion');
  });
});

describe('SIGED_HEADER_MAP', () => {
  it('mapea variantes de CCT/nombre/nivel', () => {
    expect(SIGED_HEADER_MAP.cct).toBe('cct');
    expect(SIGED_HEADER_MAP.clave_ct).toBe('cct');
    expect(SIGED_HEADER_MAP.clave_cct).toBe('cct');
    expect(SIGED_HEADER_MAP.nombre_ct).toBe('nombre');
    expect(SIGED_HEADER_MAP.nivel_educativo).toBe('nivel');
    expect(SIGED_HEADER_MAP.municipio).toBe('alcaldia');
    expect(SIGED_HEADER_MAP.delegacion).toBe('alcaldia');
    expect(SIGED_HEADER_MAP.entidad_federativa).toBe('estado');
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

describe('parseSigedCsv', () => {
  const csv = [
    'cct,nombre,nivel,tipo,turno,modalidad,latitud,longitud,alcaldia,estado',
    '09DPR0001A,ESCUELA PRIMARIA JUAREZ,PRIMARIA,Público,Matutino,Escolarizado,19.4325,-99.1332,CUAUHTEMOC,Ciudad de México',
    '09DES0005B,SECUNDARIA TECNICA 5,SECUNDARIA,Público,Vespertino,Escolarizado,19.3910,-99.1570,BENITO JUAREZ,Ciudad de México',
    '09DBT0100C,CBTIS 100,MEDIA SUPERIOR,Público,Matutino,Escolarizado,19.3589,-99.0482,IZTAPALAPA,Ciudad de México',
  ].join('\n');

  it('parsea 3 rows con nivel normalizado', () => {
    const rows = parseSigedCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.meta.nivel).toBe('primaria');
    expect(rows[1]?.meta.nivel).toBe('secundaria');
    expect(rows[2]?.meta.nivel).toBe('media_superior');
  });

  it('source_id = CCT y entity_type=school', () => {
    const rows = parseSigedCsv(csv);
    expect(rows[0]?.source_id).toBe('09DPR0001A');
    expect(rows[0]?.entity_type).toBe('school');
    expect(rows[0]?.scian_code).toBeNull();
  });

  it('computa h3_r8 a partir de coords', () => {
    const rows = parseSigedCsv(csv);
    expect(rows[0]?.h3_r8).toMatch(/^[0-9a-f]{15}$/);
    expect(rows[0]?.lat).toBeCloseTo(19.4325, 3);
    expect(rows[0]?.lng).toBeCloseTo(-99.1332, 3);
  });

  it('meta persiste cct, nivel_raw, tipo, turno, modalidad, alcaldia, estado', () => {
    const rows = parseSigedCsv(csv);
    const r = rows[0];
    expect(r?.meta.cct).toBe('09DPR0001A');
    expect(r?.meta.nivel_raw).toBe('PRIMARIA');
    expect(r?.meta.tipo).toBe('Público');
    expect(r?.meta.turno).toBe('Matutino');
    expect(r?.meta.modalidad).toBe('Escolarizado');
    expect(r?.meta.alcaldia).toBe('CUAUHTEMOC');
    expect(r?.meta.estado).toBe('Ciudad de México');
  });

  it('filtra rows con coords inválidas o ausentes', () => {
    const badCsv = [
      'cct,nombre,nivel,latitud,longitud',
      '09AAA0001A,ESC A,PRIMARIA,abc,-99.13',
      '09BBB0001B,ESC B,PRIMARIA,,',
      '09CCC0001C,ESC C,PRIMARIA,91.0,-99.13',
      '09DDD0001D,ESC D,PRIMARIA,19.43,-99.13',
    ].join('\n');
    const rows = parseSigedCsv(badCsv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source_id).toBe('09DDD0001D');
  });

  it('filtra rows sin CCT', () => {
    const badCsv = ['cct,nombre,nivel,latitud,longitud', ',ESC SIN CCT,PRIMARIA,19.43,-99.13'].join(
      '\n',
    );
    const rows = parseSigedCsv(badCsv);
    expect(rows).toHaveLength(0);
  });

  it('lanza error si faltan headers requeridos', () => {
    const bad = ['foo,bar', '1,2'].join('\n');
    expect(() => parseSigedCsv(bad)).toThrow('siged_csv_headers_not_recognized');
  });

  it('CSV vacío regresa []', () => {
    expect(parseSigedCsv('')).toEqual([]);
    expect(parseSigedCsv('   ')).toEqual([]);
  });

  it('acepta header variantes (clave_ct, delegacion, entidad)', () => {
    const csvAlt = [
      'clave_ct,nombre_ct,nivel_educativo,latitud,longitud,delegacion,entidad',
      '09ABC0001X,ESC ALT,PRIMARIA,19.43,-99.13,COYOACAN,CDMX',
    ].join('\n');
    const rows = parseSigedCsv(csvAlt);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.meta.cct).toBe('09ABC0001X');
    expect(rows[0]?.meta.alcaldia).toBe('COYOACAN');
    expect(rows[0]?.meta.estado).toBe('CDMX');
  });
});

describe('sigedDriver', () => {
  it('registrado con source=siged, category=geo, periodicity=monthly', () => {
    expect(sigedDriver.source).toBe(SIGED_SOURCE);
    expect(sigedDriver.category).toBe('geo');
    expect(sigedDriver.defaultPeriodicity).toBe(SIGED_PERIODICITY);
    expect(SIGED_PERIODICITY).toBe('monthly');
  });

  it('fetch rechaza csvText vacío', async () => {
    const ctx = {
      runId: 'r',
      source: SIGED_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(sigedDriver.fetch(ctx, { csvText: '' })).rejects.toThrow('siged_missing_payload');
    await expect(sigedDriver.fetch(ctx, { csvText: '   ' })).rejects.toThrow(
      'siged_missing_payload',
    );
  });

  it('fetch regresa el csvText', async () => {
    const ctx = {
      runId: 'r',
      source: SIGED_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'cct,nombre,nivel,latitud,longitud\n09X,E,PRIMARIA,19.4,-99.1';
    const out = await sigedDriver.fetch(ctx, { csvText: csv });
    expect(out).toBe(csv);
  });

  it('parse devuelve SigedParsedRow[]', async () => {
    const ctx = {
      runId: 'r',
      source: SIGED_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'cct,nombre,nivel,latitud,longitud\n09X0001A,ESC,PRIMARIA,19.4,-99.1';
    const rows = await sigedDriver.parse(csv, ctx);
    expect(rows).toHaveLength(1);
  });
});
