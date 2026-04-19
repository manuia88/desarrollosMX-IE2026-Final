import { describe, expect, it } from 'vitest';
import {
  CNBV_HEADER_MAP,
  CNBV_PERIODICITY,
  cnbvDriver,
  normalizeHeader,
  parseCnbvCsv,
  parseCnbvPeriod,
  parseCsvLine,
  slugifyInstitucion,
} from '../cnbv';

describe('normalizeHeader', () => {
  it('quita acentos y lowercase', () => {
    expect(normalizeHeader('Institución')).toBe('institucion');
    expect(normalizeHeader('PERÍODO')).toBe('periodo');
  });

  it('colapsa espacios / paréntesis / puntuación a underscore', () => {
    expect(normalizeHeader('Cartera Total (mdp)')).toBe('cartera_total_mdp');
    expect(normalizeHeader('Tasa Promedio (%)')).toBe('tasa_promedio');
    expect(normalizeHeader('Cartera-Vencida MDP')).toBe('cartera_vencida_mdp');
  });

  it('trim edges y acepta string vacío', () => {
    expect(normalizeHeader('  Periodo  ')).toBe('periodo');
    expect(normalizeHeader('')).toBe('');
  });
});

describe('slugifyInstitucion', () => {
  it('slugifica nombres con acentos y espacios', () => {
    expect(slugifyInstitucion('BBVA México')).toBe('bbva_mexico');
    expect(slugifyInstitucion('HSBC')).toBe('hsbc');
    expect(slugifyInstitucion('Santander')).toBe('santander');
    expect(slugifyInstitucion('Banco del Bajío')).toBe('banco_del_bajio');
  });

  it('limpia puntuación y caracteres especiales', () => {
    expect(slugifyInstitucion('BanCoppel S.A.')).toBe('bancoppel_s_a');
    expect(slugifyInstitucion('Scotiabank Inverlat')).toBe('scotiabank_inverlat');
  });
});

describe('parseCsvLine', () => {
  it('split simple por comas', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('respeta comillas con comas internas', () => {
    expect(parseCsvLine('"a,b",c,"d,e,f"')).toEqual(['a,b', 'c', 'd,e,f']);
  });

  it('soporta comillas escapadas ""', () => {
    expect(parseCsvLine('"he said ""hi""",next')).toEqual(['he said "hi"', 'next']);
  });

  it('maneja campos vacíos', () => {
    expect(parseCsvLine(',a,,b,')).toEqual(['', 'a', '', 'b', '']);
  });

  it('preserva espacios dentro de comillas', () => {
    expect(parseCsvLine('"  hola  ",mundo')).toEqual(['  hola  ', 'mundo']);
  });
});

describe('parseCnbvPeriod', () => {
  it('parsea YYYY-MM', () => {
    const p = parseCnbvPeriod('2026-03');
    expect(p).not.toBeNull();
    expect(p?.period_start).toBe('2026-03-01');
    expect(p?.period_end).toBe('2026-03-31');
  });

  it('parsea YYYY-MM-DD y normaliza al mes', () => {
    const p = parseCnbvPeriod('2026-03-15');
    expect(p?.period_start).toBe('2026-03-01');
    expect(p?.period_end).toBe('2026-03-31');
  });

  it('parsea YYYY/MM y mes febrero (28/29 días)', () => {
    expect(parseCnbvPeriod('2026/02')?.period_end).toBe('2026-02-28');
    expect(parseCnbvPeriod('2024/02')?.period_end).toBe('2024-02-29');
  });

  it('parsea "marzo 2026" y "Marzo-2026"', () => {
    expect(parseCnbvPeriod('marzo 2026')?.period_start).toBe('2026-03-01');
    expect(parseCnbvPeriod('Marzo-2026')?.period_start).toBe('2026-03-01');
    expect(parseCnbvPeriod('mar 2026')?.period_start).toBe('2026-03-01');
  });

  it('regresa null para inputs inválidos', () => {
    expect(parseCnbvPeriod(null)).toBeNull();
    expect(parseCnbvPeriod('')).toBeNull();
    expect(parseCnbvPeriod('abc')).toBeNull();
    expect(parseCnbvPeriod('2026-13')).toBeNull();
  });
});

describe('parseCnbvCsv — happy path', () => {
  const csv = [
    'Periodo,Institución,Cartera Total (mdp),Cartera Vencida (mdp),Tasa Promedio (%)',
    '2026-03,BBVA México,500000.5,12000.25,9.85',
    '2026-03,Santander,350000,8500,10.12',
    '2026-03,HSBC,120000,3000,10.5',
  ].join('\n');

  it('emite 3 metrics × 3 instituciones = 9 rows', () => {
    const rows = parseCnbvCsv(csv);
    expect(rows.length).toBe(9);
  });

  it('series_id usa slug + prefix y unit correcto', () => {
    const rows = parseCnbvCsv(csv);
    const bbvaTotal = rows.find((r) => r.series_id === 'cartera_total_bbva_mexico');
    expect(bbvaTotal?.metric_name).toBe('cartera_total');
    expect(bbvaTotal?.unit).toBe('MXN_mdp');
    expect(bbvaTotal?.value).toBe(500000.5);
    expect(bbvaTotal?.period_start).toBe('2026-03-01');
    expect(bbvaTotal?.period_end).toBe('2026-03-31');

    const bbvaVencida = rows.find((r) => r.series_id === 'cartera_vencida_bbva_mexico');
    expect(bbvaVencida?.metric_name).toBe('cartera_vencida');
    expect(bbvaVencida?.unit).toBe('MXN_mdp');
    expect(bbvaVencida?.value).toBe(12000.25);

    const bbvaTasa = rows.find((r) => r.series_id === 'tasa_bbva_mexico');
    expect(bbvaTasa?.metric_name).toBe('tasa_promedio');
    expect(bbvaTasa?.unit).toBe('pct');
    expect(bbvaTasa?.value).toBe(9.85);
  });

  it('periodicity = monthly y source_span preserva raw', () => {
    const rows = parseCnbvCsv(csv);
    const first = rows[0];
    expect(first).toBeDefined();
    expect(first?.periodicity).toBe(CNBV_PERIODICITY);
    expect(first?.source_span.institucion.length).toBeGreaterThan(0);
    expect(first?.source_span.raw_headers.length).toBeGreaterThan(0);
    expect(first?.source_span.raw_row_index).toBeGreaterThanOrEqual(1);
    expect(first?.source_span.mapped_header).toBeDefined();
  });
});

describe('parseCnbvCsv — tolerancias', () => {
  it('tolera rows vacías y valores N/D', () => {
    const csv = [
      'periodo,banco,cartera_total,cartera_vencida,tasa',
      '2026-03,Banorte,250000,N/D,9.5',
      '',
      '2026-03,Scotiabank,,,N/A',
      '2026-03,Santander,350000,8500,10.1',
    ].join('\n');
    const rows = parseCnbvCsv(csv);
    // Banorte: cartera_total + tasa (vencida N/D descartado) = 2
    // Scotiabank: todos N/D → 0
    // Santander: 3
    expect(rows.length).toBe(5);
    const banorteTotal = rows.find((r) => r.series_id === 'cartera_total_banorte');
    expect(banorteTotal?.value).toBe(250000);
    const banorteVencida = rows.find((r) => r.series_id === 'cartera_vencida_banorte');
    expect(banorteVencida).toBeUndefined();
  });

  it('mapea headers variantes case/accent-insensitive', () => {
    const csv = [
      'FECHA,ENTIDAD,SALDO_TOTAL,saldo_vencido,Tasa Interés Promedio',
      '2026-03,BBVA,500000,12000,9.85',
    ].join('\n');
    const rows = parseCnbvCsv(csv);
    expect(rows.length).toBe(3);
    expect(rows.find((r) => r.metric_name === 'cartera_total')?.value).toBe(500000);
    expect(rows.find((r) => r.metric_name === 'cartera_vencida')?.value).toBe(12000);
    expect(rows.find((r) => r.metric_name === 'tasa_promedio')?.value).toBe(9.85);
  });

  it('lanza error si headers requeridos no mapean', () => {
    const csv = ['foo,bar,baz', '1,2,3'].join('\n');
    expect(() => parseCnbvCsv(csv)).toThrow('cnbv_csv_headers_not_recognized');
  });

  it('lanza error si no hay columna de métrica mapeable', () => {
    const csv = ['periodo,institucion,otra_col', '2026-03,BBVA,123'].join('\n');
    expect(() => parseCnbvCsv(csv)).toThrow('cnbv_csv_headers_not_recognized');
  });

  it('CSV vacío regresa []', () => {
    expect(parseCnbvCsv('')).toEqual([]);
    expect(parseCnbvCsv('   ')).toEqual([]);
  });

  it('soporta CRLF line endings', () => {
    const csv =
      'periodo,institucion,cartera_total\r\n2026-03,BBVA,500000\r\n2026-03,HSBC,120000\r\n';
    const rows = parseCnbvCsv(csv);
    expect(rows.length).toBe(2);
  });

  it('periodo inválido en row descarta la row', () => {
    const csv = [
      'periodo,institucion,cartera_total',
      'abc,BBVA,500000',
      '2026-03,HSBC,120000',
    ].join('\n');
    const rows = parseCnbvCsv(csv);
    expect(rows.length).toBe(1);
    expect(rows[0]?.series_id).toBe('cartera_total_hsbc');
  });
});

describe('CNBV_HEADER_MAP', () => {
  it('incluye aliases para periodo/institucion/métricas', () => {
    expect(CNBV_HEADER_MAP.periodo).toBe('periodo');
    expect(CNBV_HEADER_MAP.fecha).toBe('periodo');
    expect(CNBV_HEADER_MAP.banco).toBe('institucion');
    expect(CNBV_HEADER_MAP.entidad).toBe('institucion');
    expect(CNBV_HEADER_MAP.cartera_total_mdp).toBe('cartera_total_mdp');
    expect(CNBV_HEADER_MAP.saldo_vencido).toBe('cartera_vencida_mdp');
    expect(CNBV_HEADER_MAP.tasa_interes_promedio).toBe('tasa_promedio_pct');
  });
});

describe('cnbvDriver', () => {
  it('está registrado con source=cnbv, category=macro, periodicity=monthly', () => {
    expect(cnbvDriver.source).toBe('cnbv');
    expect(cnbvDriver.category).toBe('macro');
    expect(cnbvDriver.defaultPeriodicity).toBe('monthly');
  });

  it('fetch regresa el csvText provisto', async () => {
    const ctx = {
      runId: 'r',
      source: 'cnbv',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'periodo,institucion,cartera_total\n2026-03,BBVA,500000';
    const out = await cnbvDriver.fetch(ctx, { csvText: csv });
    expect(out).toBe(csv);
  });

  it('fetch rechaza csvText ausente', async () => {
    const ctx = {
      runId: 'r',
      source: 'cnbv',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(cnbvDriver.fetch(ctx, { csvText: '' })).rejects.toThrow('cnbv_missing_csv');
  });

  it('parse produce rows para CSV válido', async () => {
    const ctx = {
      runId: 'r',
      source: 'cnbv',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = [
      'periodo,institucion,cartera_total,cartera_vencida,tasa',
      '2026-03,BBVA,500000,12000,9.85',
    ].join('\n');
    const rows = await cnbvDriver.parse(csv, ctx);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(3);
  });
});
