import { describe, expect, it } from 'vitest';
import {
  CLUES_HEADER_MAP,
  CLUES_INSTITUCION_CANONICAL,
  CLUES_NIVEL_ATENCION_CANONICAL,
  CLUES_PERIODICITY,
  CLUES_SOURCE,
  dgisDriver,
  normalizeHeader,
  parseCluesInstitucion,
  parseCluesNivelAtencion,
  parseDgisCsv,
} from '../dgis';

describe('CLUES_INSTITUCION_CANONICAL', () => {
  it('expone las 8 instituciones canónicas', () => {
    expect(CLUES_INSTITUCION_CANONICAL).toEqual([
      'IMSS',
      'ISSSTE',
      'SSA',
      'PEMEX',
      'SEDENA',
      'SEMAR',
      'privado',
      'otros',
    ]);
  });
});

describe('CLUES_NIVEL_ATENCION_CANONICAL', () => {
  it('expone los 4 niveles canónicos', () => {
    expect(CLUES_NIVEL_ATENCION_CANONICAL).toEqual([
      'primer_nivel',
      'segundo_nivel',
      'tercer_nivel',
      'otros',
    ]);
  });
});

describe('CLUES_SOURCE', () => {
  it("usa 'clues' (no 'dgis') — nombre canónico en allowlist", () => {
    expect(CLUES_SOURCE).toBe('clues');
  });
});

describe('parseCluesInstitucion', () => {
  it('detecta IMSS e IMSS-Bienestar', () => {
    expect(parseCluesInstitucion('IMSS')).toBe('IMSS');
    expect(parseCluesInstitucion('Instituto Mexicano del IMSS')).toBe('IMSS');
    expect(parseCluesInstitucion('IMSS BIENESTAR')).toBe('IMSS');
    expect(parseCluesInstitucion('IMSS-Bienestar')).toBe('IMSS');
  });

  it('detecta ISSSTE (antes de ISSS/IMSS colisión)', () => {
    expect(parseCluesInstitucion('ISSSTE')).toBe('ISSSTE');
    expect(parseCluesInstitucion('Issste')).toBe('ISSSTE');
  });

  it('detecta SSA / Secretaría de Salud', () => {
    expect(parseCluesInstitucion('SSA')).toBe('SSA');
    expect(parseCluesInstitucion('Secretaría de Salud')).toBe('SSA');
    expect(parseCluesInstitucion('Servicios de Salud del Estado')).toBe('SSA');
  });

  it('detecta PEMEX', () => {
    expect(parseCluesInstitucion('PEMEX')).toBe('PEMEX');
    expect(parseCluesInstitucion('Petróleos Mexicanos (PEMEX)')).toBe('PEMEX');
  });

  it('detecta SEDENA y SEMAR', () => {
    expect(parseCluesInstitucion('SEDENA')).toBe('SEDENA');
    expect(parseCluesInstitucion('Defensa Nacional')).toBe('SEDENA');
    expect(parseCluesInstitucion('SEMAR')).toBe('SEMAR');
    expect(parseCluesInstitucion('Secretaría de Marina')).toBe('SEMAR');
  });

  it('detecta privado', () => {
    expect(parseCluesInstitucion('Privado')).toBe('privado');
    expect(parseCluesInstitucion('Hospital Privado ABC')).toBe('privado');
  });

  it('fallback otros para no-mapeadas', () => {
    expect(parseCluesInstitucion('Cruz Roja Mexicana')).toBe('otros');
    expect(parseCluesInstitucion('')).toBe('otros');
    expect(parseCluesInstitucion(null)).toBe('otros');
    expect(parseCluesInstitucion(undefined)).toBe('otros');
  });
});

describe('parseCluesNivelAtencion', () => {
  it('detecta primer/segundo/tercer nivel', () => {
    expect(parseCluesNivelAtencion('PRIMER NIVEL')).toBe('primer_nivel');
    expect(parseCluesNivelAtencion('Segundo nivel')).toBe('segundo_nivel');
    expect(parseCluesNivelAtencion('TERCER NIVEL')).toBe('tercer_nivel');
  });

  it('acepta códigos numéricos 1/2/3', () => {
    expect(parseCluesNivelAtencion('1')).toBe('primer_nivel');
    expect(parseCluesNivelAtencion('2')).toBe('segundo_nivel');
    expect(parseCluesNivelAtencion('3')).toBe('tercer_nivel');
  });

  it('acepta abreviaciones 1er/2do/3er', () => {
    expect(parseCluesNivelAtencion('1er')).toBe('primer_nivel');
    expect(parseCluesNivelAtencion('2do')).toBe('segundo_nivel');
    expect(parseCluesNivelAtencion('3er')).toBe('tercer_nivel');
  });

  it('fallback otros', () => {
    expect(parseCluesNivelAtencion('Nivel cuatro')).toBe('otros');
    expect(parseCluesNivelAtencion('')).toBe('otros');
    expect(parseCluesNivelAtencion(null)).toBe('otros');
  });
});

describe('normalizeHeader', () => {
  it('quita acentos, lowercase, colapsa separadores', () => {
    expect(normalizeHeader('NOMBRE DE LA INSTITUCIÓN')).toBe('nombre_de_la_institucion');
    expect(normalizeHeader('  NOM_ENT  ')).toBe('nom_ent');
  });
});

describe('CLUES_HEADER_MAP', () => {
  it('mapea variantes de CLUES/institución/nivel', () => {
    expect(CLUES_HEADER_MAP.clues).toBe('clues');
    expect(CLUES_HEADER_MAP.cve_clues).toBe('clues');
    expect(CLUES_HEADER_MAP.nombre_de_la_institucion).toBe('institucion');
    expect(CLUES_HEADER_MAP.nivel_atencion).toBe('nivel_atencion');
    expect(CLUES_HEADER_MAP.nom_mun).toBe('alcaldia');
    expect(CLUES_HEADER_MAP.nom_ent).toBe('estado');
  });
});

describe('parseDgisCsv', () => {
  const csv = [
    'clues,nombre,institucion,tipo,nivel_atencion,latitud,longitud,alcaldia,estado',
    'DFIMS000011,HOSPITAL GENERAL DF IMSS,IMSS,Hospital,Segundo Nivel,19.4325,-99.1332,CUAUHTEMOC,Ciudad de México',
    'DFSSA000022,CENTRO DE SALUD TEPITO,Secretaría de Salud,Centro de Salud,Primer Nivel,19.3910,-99.1570,CUAUHTEMOC,Ciudad de México',
    'DFISS000033,CLÍNICA ISSSTE IZTAPALAPA,ISSSTE,Clínica,Segundo Nivel,19.3589,-99.0482,IZTAPALAPA,Ciudad de México',
  ].join('\n');

  it('parsea 3 rows con institución y nivel normalizados', () => {
    const rows = parseDgisCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.meta.institucion).toBe('IMSS');
    expect(rows[0]?.meta.nivel_atencion).toBe('segundo_nivel');
    expect(rows[1]?.meta.institucion).toBe('SSA');
    expect(rows[1]?.meta.nivel_atencion).toBe('primer_nivel');
    expect(rows[2]?.meta.institucion).toBe('ISSSTE');
  });

  it('source_id = CLUES y entity_type=healthcare_facility', () => {
    const rows = parseDgisCsv(csv);
    expect(rows[0]?.source_id).toBe('DFIMS000011');
    expect(rows[0]?.entity_type).toBe('healthcare_facility');
    expect(rows[0]?.scian_code).toBeNull();
  });

  it('computa h3_r8 a partir de coords', () => {
    const rows = parseDgisCsv(csv);
    expect(rows[0]?.h3_r8).toMatch(/^[0-9a-f]{15}$/);
    expect(rows[0]?.lat).toBeCloseTo(19.4325, 3);
    expect(rows[0]?.lng).toBeCloseTo(-99.1332, 3);
  });

  it('meta persiste clues, institucion_raw, tipo, nivel_atencion_raw, alcaldia, estado', () => {
    const rows = parseDgisCsv(csv);
    const r = rows[0];
    expect(r?.meta.clues).toBe('DFIMS000011');
    expect(r?.meta.institucion_raw).toBe('IMSS');
    expect(r?.meta.tipo).toBe('Hospital');
    expect(r?.meta.nivel_atencion_raw).toBe('Segundo Nivel');
    expect(r?.meta.alcaldia).toBe('CUAUHTEMOC');
    expect(r?.meta.estado).toBe('Ciudad de México');
  });

  it('filtra rows con coords inválidas o sin CLUES', () => {
    const badCsv = [
      'clues,nombre,institucion,latitud,longitud',
      ',SIN CLUES,IMSS,19.43,-99.13',
      'DFAAA000001,INVALID COORDS,IMSS,abc,-99.13',
      'DFBBB000002,VALID,IMSS,19.43,-99.13',
    ].join('\n');
    const rows = parseDgisCsv(badCsv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source_id).toBe('DFBBB000002');
  });

  it('lanza error si faltan headers requeridos', () => {
    const bad = ['foo,bar', '1,2'].join('\n');
    expect(() => parseDgisCsv(bad)).toThrow('dgis_csv_headers_not_recognized');
  });

  it('CSV vacío regresa []', () => {
    expect(parseDgisCsv('')).toEqual([]);
    expect(parseDgisCsv('   ')).toEqual([]);
  });

  it('acepta header variantes (cve_clues, nom_mun, entidad)', () => {
    const csvAlt = [
      'cve_clues,nombre_establecimiento,nom_institucion,latitud,longitud,nom_mun,entidad',
      'DFXYZ000001,UNIDAD ALT,Pemex,19.4,-99.1,BENITO JUAREZ,CDMX',
    ].join('\n');
    const rows = parseDgisCsv(csvAlt);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.meta.clues).toBe('DFXYZ000001');
    expect(rows[0]?.meta.institucion).toBe('PEMEX');
    expect(rows[0]?.meta.alcaldia).toBe('BENITO JUAREZ');
    expect(rows[0]?.meta.estado).toBe('CDMX');
  });
});

describe('dgisDriver', () => {
  it('registrado con source=clues, category=geo, periodicity=monthly', () => {
    expect(dgisDriver.source).toBe(CLUES_SOURCE);
    expect(dgisDriver.source).toBe('clues');
    expect(dgisDriver.category).toBe('geo');
    expect(dgisDriver.defaultPeriodicity).toBe(CLUES_PERIODICITY);
    expect(CLUES_PERIODICITY).toBe('monthly');
  });

  it('fetch rechaza csvText vacío', async () => {
    const ctx = {
      runId: 'r',
      source: CLUES_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(dgisDriver.fetch(ctx, { csvText: '' })).rejects.toThrow('dgis_missing_payload');
    await expect(dgisDriver.fetch(ctx, { csvText: '   ' })).rejects.toThrow('dgis_missing_payload');
  });

  it('parse devuelve CluesParsedRow[]', async () => {
    const ctx = {
      runId: 'r',
      source: CLUES_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'clues,nombre,institucion,latitud,longitud\nDF000001,HOSP,IMSS,19.4,-99.1';
    const rows = await dgisDriver.parse(csv, ctx);
    expect(rows).toHaveLength(1);
  });
});
