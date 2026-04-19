import { describe, expect, it } from 'vitest';
import {
  normalizeHeader,
  parseCsvLine,
  parseSacmexAfectacion,
  parseSacmexCsv,
  parseSacmexDate,
  SACMEX_AFECTACION_CANONICAL,
  SACMEX_HEADER_MAP,
  SACMEX_PERIODICITY,
  SACMEX_SOURCE,
  sacmexDriver,
} from '../sacmex';

describe('SACMEX_AFECTACION_CANONICAL', () => {
  it('expone los 5 tipos canónicos', () => {
    expect(SACMEX_AFECTACION_CANONICAL).toEqual([
      'corte_total',
      'presion_baja',
      'sin_agua',
      'tandeo',
      'otros',
    ]);
  });
});

describe('parseSacmexAfectacion', () => {
  it('detecta corte_total', () => {
    expect(parseSacmexAfectacion('Corte Total')).toBe('corte_total');
    expect(parseSacmexAfectacion('CORTE TOTAL DE SERVICIO')).toBe('corte_total');
  });

  it('detecta tandeo', () => {
    expect(parseSacmexAfectacion('Tandeo')).toBe('tandeo');
    expect(parseSacmexAfectacion('Tanda programada')).toBe('tandeo');
  });

  it('detecta presion_baja', () => {
    expect(parseSacmexAfectacion('Presión Baja')).toBe('presion_baja');
    expect(parseSacmexAfectacion('Baja presión')).toBe('presion_baja');
  });

  it('detecta sin_agua (desabasto/suspensión)', () => {
    expect(parseSacmexAfectacion('Sin agua')).toBe('sin_agua');
    expect(parseSacmexAfectacion('Desabasto total')).toBe('sin_agua');
    expect(parseSacmexAfectacion('Suspensión del servicio')).toBe('sin_agua');
  });

  it('corte_total prioriza sobre sin_agua cuando coexisten', () => {
    expect(parseSacmexAfectacion('Corte total y sin agua')).toBe('corte_total');
  });

  it('fallback otros', () => {
    expect(parseSacmexAfectacion('Fuga menor')).toBe('otros');
    expect(parseSacmexAfectacion('')).toBe('otros');
    expect(parseSacmexAfectacion(null)).toBe('otros');
    expect(parseSacmexAfectacion(undefined)).toBe('otros');
  });
});

describe('parseSacmexDate', () => {
  it('parsea ISO YYYY-MM-DD y YYYY/MM/DD', () => {
    expect(parseSacmexDate('2026-04-18')).toBe('2026-04-18');
    expect(parseSacmexDate('2026/04/18')).toBe('2026-04-18');
  });

  it('parsea DD/MM/YYYY y DD-MM-YYYY', () => {
    expect(parseSacmexDate('18/04/2026')).toBe('2026-04-18');
    expect(parseSacmexDate('18-04-2026')).toBe('2026-04-18');
  });

  it('regresa null para formatos inválidos', () => {
    expect(parseSacmexDate('abc')).toBeNull();
    expect(parseSacmexDate('')).toBeNull();
    expect(parseSacmexDate(null)).toBeNull();
    expect(parseSacmexDate('2026-13-01')).toBeNull();
    expect(parseSacmexDate('32/04/2026')).toBeNull();
  });
});

describe('normalizeHeader', () => {
  it('normaliza tildes/espacios/mayúsculas', () => {
    expect(normalizeHeader('FECHA DE INICIO')).toBe('fecha_de_inicio');
    expect(normalizeHeader('  DELEGACIÓN ')).toBe('delegacion');
  });
});

describe('SACMEX_HEADER_MAP', () => {
  it('mapea alias de alcaldía/fecha/afectación', () => {
    expect(SACMEX_HEADER_MAP.alcaldia).toBe('alcaldia');
    expect(SACMEX_HEADER_MAP.delegacion).toBe('alcaldia');
    expect(SACMEX_HEADER_MAP.fecha_de_inicio).toBe('fecha_inicio');
    expect(SACMEX_HEADER_MAP.inicio).toBe('fecha_inicio');
    expect(SACMEX_HEADER_MAP.fecha_de_fin).toBe('fecha_fin');
    expect(SACMEX_HEADER_MAP.afectacion).toBe('tipo_afectacion');
    expect(SACMEX_HEADER_MAP.causa).toBe('motivo');
  });
});

describe('parseCsvLine', () => {
  it('respeta comillas y campos vacíos', () => {
    expect(parseCsvLine('"a,b",c,,d')).toEqual(['a,b', 'c', '', 'd']);
  });
});

describe('parseSacmexCsv', () => {
  const csv = [
    'alcaldia,colonia,fecha_inicio,fecha_fin,tipo_afectacion,motivo,latitud,longitud',
    'IZTAPALAPA,SANTA MARTHA,2026-04-18,2026-04-20,Corte Total,Reparación tubería,19.3589,-99.0482',
    'BENITO JUAREZ,NARVARTE,2026-04-17,2026-04-19,Presión Baja,,19.3910,-99.1570',
    'COYOACAN,DEL CARMEN,2026-04-16,,Tandeo,Obra hidráulica,,',
  ].join('\n');

  it('parsea 3 rows con tipo normalizado', () => {
    const rows = parseSacmexCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.meta.tipo_afectacion).toBe('corte_total');
    expect(rows[1]?.meta.tipo_afectacion).toBe('presion_baja');
    expect(rows[2]?.meta.tipo_afectacion).toBe('tandeo');
  });

  it('entity_type=water_cut, scian_code=null', () => {
    const rows = parseSacmexCsv(csv);
    expect(rows[0]?.entity_type).toBe('water_cut');
    expect(rows[0]?.scian_code).toBeNull();
  });

  it('source_id = hash estable hash(alcaldia+colonia+fecha_inicio)', () => {
    const rows = parseSacmexCsv(csv);
    for (const r of rows) {
      expect(r?.source_id).toMatch(/^sacmex_[0-9a-f]{8}$/);
    }
    // Mismo insumo 2 veces → mismo hash.
    const dupCsv = [
      'alcaldia,colonia,fecha_inicio,fecha_fin,tipo_afectacion,latitud,longitud',
      'IZTAPALAPA,SANTA MARTHA,2026-04-18,2026-04-20,Corte Total,19.3589,-99.0482',
      'IZTAPALAPA,SANTA MARTHA,2026-04-18,2026-04-21,Corte Total,19.3589,-99.0482',
    ].join('\n');
    const dup = parseSacmexCsv(dupCsv);
    expect(dup[0]?.source_id).toBe(dup[1]?.source_id);
  });

  it('name incluye tipo, colonia y alcaldía', () => {
    const rows = parseSacmexCsv(csv);
    expect(rows[0]?.name).toBe('corte_total — SANTA MARTHA, IZTAPALAPA');
  });

  it('valid_from=fecha_inicio, valid_to=fecha_fin, meta persiste raw', () => {
    const rows = parseSacmexCsv(csv);
    const r = rows[0];
    expect(r?.valid_from).toBe('2026-04-18');
    expect(r?.valid_to).toBe('2026-04-20');
    expect(r?.meta.fecha_inicio_raw).toBe('2026-04-18');
    expect(r?.meta.fecha_fin_raw).toBe('2026-04-20');
    expect(r?.meta.motivo).toBe('Reparación tubería');
  });

  it('computa h3_r8 solo cuando hay lat/lng válidos', () => {
    const rows = parseSacmexCsv(csv);
    expect(rows[0]?.h3_r8).toMatch(/^[0-9a-f]{15}$/);
    expect(rows[0]?.lat).toBeCloseTo(19.3589, 3);
    // Row 3 sin coords.
    expect(rows[2]?.h3_r8).toBeNull();
    expect(rows[2]?.lat).toBeNull();
    expect(rows[2]?.lng).toBeNull();
  });

  it('filtra rows sin alcaldia/colonia/fecha_inicio válida', () => {
    const badCsv = [
      'alcaldia,colonia,fecha_inicio,fecha_fin,tipo_afectacion',
      ',SANTA MARTHA,2026-04-18,,Corte Total',
      'IZTAPALAPA,,2026-04-18,,Corte Total',
      'IZTAPALAPA,SANTA MARTHA,fecha-invalida,,Corte Total',
      'COYOACAN,DEL CARMEN,2026-04-18,,Corte Total',
    ].join('\n');
    const rows = parseSacmexCsv(badCsv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.meta.alcaldia).toBe('COYOACAN');
  });

  it('lanza error si faltan headers requeridos', () => {
    const bad = ['foo,bar', '1,2'].join('\n');
    expect(() => parseSacmexCsv(bad)).toThrow('sacmex_csv_headers_not_recognized');
  });

  it('CSV vacío regresa []', () => {
    expect(parseSacmexCsv('')).toEqual([]);
    expect(parseSacmexCsv('   ')).toEqual([]);
  });
});

describe('sacmexDriver', () => {
  it('registrado con source=sacmex, category=geo, periodicity=weekly', () => {
    expect(sacmexDriver.source).toBe(SACMEX_SOURCE);
    expect(sacmexDriver.category).toBe('geo');
    expect(sacmexDriver.defaultPeriodicity).toBe(SACMEX_PERIODICITY);
    expect(SACMEX_PERIODICITY).toBe('weekly');
  });

  it('fetch acepta kind=csv con text no vacío', async () => {
    const ctx = {
      runId: 'r',
      source: SACMEX_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'alcaldia,colonia,fecha_inicio\nIZTAPALAPA,SANTA MARTHA,2026-04-18';
    const out = await sacmexDriver.fetch(ctx, { kind: 'csv', text: csv });
    expect(out.kind).toBe('csv');
  });

  it('fetch rechaza kind=html como no implementado (H2)', async () => {
    const ctx = {
      runId: 'r',
      source: SACMEX_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(sacmexDriver.fetch(ctx, { kind: 'html', text: '<html></html>' })).rejects.toThrow(
      'sacmex_html_parsing_not_implemented',
    );
  });

  it('fetch rechaza kind=csv vacío', async () => {
    const ctx = {
      runId: 'r',
      source: SACMEX_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(sacmexDriver.fetch(ctx, { kind: 'csv', text: '' })).rejects.toThrow(
      'sacmex_missing_payload',
    );
  });

  it('parse con kind=html throws sacmex_html_parsing_not_implemented', async () => {
    const ctx = {
      runId: 'r',
      source: SACMEX_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(sacmexDriver.parse({ kind: 'html', text: '<html></html>' }, ctx)).rejects.toThrow(
      'sacmex_html_parsing_not_implemented',
    );
  });
});
