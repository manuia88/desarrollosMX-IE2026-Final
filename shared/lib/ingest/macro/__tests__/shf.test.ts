import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseShfQuarter,
  parseShfValue,
  parseShfWorkbook,
  SHF_ENTIDAD_CVE,
  SHF_METRIC,
  SHF_UNIT,
  shfDriver,
} from '../shf';

function buildWideBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const aoa: Array<Array<string | number | null>> = [
    ['Índice SHF de Precios de la Vivienda', null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    ['Estado', 'Q1_2024', 'Q2_2024', 'Q3_2024', 'Q4_2024'],
    ['Nacional', 180.5, 182.1, 183.4, 185.0],
    ['Ciudad de México', 200.1, 201.5, 'N/D', 204.2],
    ['Jalisco', 175.0, 176.2, 177.1, 178.5],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, sheet, 'IPV');
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown;
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}

function buildLongBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const aoa: Array<Array<string | number | null>> = [
    ['Estado', 'Año', 'Trimestre', 'IPV'],
    ['Nacional', 2024, 1, 180.5],
    ['Nacional', 2024, 'Q2', 182.1],
    ['Nuevo León', 2024, 'I', 190.0],
    ['Nuevo León', 2024, 'II', 191.3],
    ['Yucatán', 2024, 3, 'N/D'],
    ['Yucatán', 2024, 4, 165.5],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, sheet, 'IPV_long');
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown;
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}

describe('SHF_ENTIDAD_CVE', () => {
  it('incluye 32 entidades + nacional', () => {
    expect(SHF_ENTIDAD_CVE.Nacional).toBe('00');
    expect(SHF_ENTIDAD_CVE.Aguascalientes).toBe('01');
    expect(SHF_ENTIDAD_CVE['Ciudad de México']).toBe('09');
    expect(SHF_ENTIDAD_CVE.CDMX).toBe('09');
    expect(SHF_ENTIDAD_CVE['Distrito Federal']).toBe('09');
    expect(SHF_ENTIDAD_CVE.Jalisco).toBe('14');
    expect(SHF_ENTIDAD_CVE['Nuevo León']).toBe('19');
    expect(SHF_ENTIDAD_CVE.Zacatecas).toBe('32');
  });

  it('cubre valores únicos esperados (00..32)', () => {
    const cves = new Set(Object.values(SHF_ENTIDAD_CVE));
    // 33 valores únicos: 00 nacional + 01..32 entidades
    expect(cves.size).toBe(33);
  });
});

describe('parseShfQuarter', () => {
  it('acepta 1|Q1|I|T1 como Q1', () => {
    expect(parseShfQuarter('1')?.quarterNum).toBe(1);
    expect(parseShfQuarter(1)?.quarterNum).toBe(1);
    expect(parseShfQuarter('Q1')?.quarterNum).toBe(1);
    expect(parseShfQuarter('I')?.quarterNum).toBe(1);
    expect(parseShfQuarter('T1')?.quarterNum).toBe(1);
  });

  it('acepta numerales romanos II..IV', () => {
    expect(parseShfQuarter('II')?.quarterNum).toBe(2);
    expect(parseShfQuarter('III')?.quarterNum).toBe(3);
    expect(parseShfQuarter('IV')?.quarterNum).toBe(4);
  });

  it('regresa null para inputs inválidos', () => {
    expect(parseShfQuarter('')).toBeNull();
    expect(parseShfQuarter('Q5')).toBeNull();
    expect(parseShfQuarter('0')).toBeNull();
    expect(parseShfQuarter(null)).toBeNull();
    expect(parseShfQuarter(undefined)).toBeNull();
    expect(parseShfQuarter('abc')).toBeNull();
  });
});

describe('parseShfValue', () => {
  it('parsea números y strings numéricos', () => {
    expect(parseShfValue(180.5)).toBe(180.5);
    expect(parseShfValue('180.5')).toBe(180.5);
    expect(parseShfValue('1,234.56')).toBeCloseTo(1234.56);
  });

  it('regresa null para N/D, vacío, guiones', () => {
    expect(parseShfValue('N/D')).toBeNull();
    expect(parseShfValue('ND')).toBeNull();
    expect(parseShfValue('N/E')).toBeNull();
    expect(parseShfValue('')).toBeNull();
    expect(parseShfValue(null)).toBeNull();
    expect(parseShfValue(undefined)).toBeNull();
    expect(parseShfValue('-')).toBeNull();
    expect(parseShfValue('abc')).toBeNull();
    expect(parseShfValue(Number.NaN)).toBeNull();
  });
});

describe('parseShfWorkbook (wide)', () => {
  it('extrae rows Q1..Q4 de cada entidad, omite N/D', () => {
    const buf = buildWideBuffer();
    const rows = parseShfWorkbook(buf);
    // Nacional: 4 + CDMX: 3 (1 N/D) + Jalisco: 4 = 11
    expect(rows.length).toBe(11);
    for (const r of rows) {
      expect(r.metric_name).toBe(SHF_METRIC);
      expect(r.unit).toBe(SHF_UNIT);
      expect(r.periodicity).toBe('quarterly');
    }
  });

  it('genera series_id correctos y periodos por trimestre', () => {
    const buf = buildWideBuffer();
    const rows = parseShfWorkbook(buf);
    const nacionalQ1 = rows.find(
      (r) => r.series_id === 'ipv_nacional' && r.period_start === '2024-01-01',
    );
    expect(nacionalQ1?.value).toBe(180.5);
    expect(nacionalQ1?.period_end).toBe('2024-03-31');

    const cdmxQ2 = rows.find((r) => r.series_id === 'ipv_09' && r.period_start === '2024-04-01');
    expect(cdmxQ2?.value).toBe(201.5);
    expect(cdmxQ2?.period_end).toBe('2024-06-30');

    const jalQ4 = rows.find((r) => r.series_id === 'ipv_14' && r.period_start === '2024-10-01');
    expect(jalQ4?.value).toBe(178.5);
    expect(jalQ4?.period_end).toBe('2024-12-31');
  });

  it('preserva source_span con sheet/row/header/value', () => {
    const buf = buildWideBuffer();
    const rows = parseShfWorkbook(buf);
    const first = rows[0];
    expect(first).toBeDefined();
    expect(first?.source_span.raw_sheet).toBe('IPV');
    expect(typeof first?.source_span.raw_row).toBe('number');
    expect(first?.source_span.raw_header.length).toBeGreaterThan(0);
  });
});

describe('parseShfWorkbook (long)', () => {
  it('extrae rows desde formato long Estado|Año|Trimestre|IPV', () => {
    const buf = buildLongBuffer();
    const rows = parseShfWorkbook(buf);
    // Nacional: 2 + NL: 2 + Yucatán: 1 (1 N/D descartado) = 5
    expect(rows.length).toBe(5);
    const nlQ1 = rows.find((r) => r.series_id === 'ipv_19' && r.period_start === '2024-01-01');
    expect(nlQ1?.value).toBe(190);
    expect(nlQ1?.period_end).toBe('2024-03-31');
    const yucQ4 = rows.find((r) => r.series_id === 'ipv_31' && r.period_start === '2024-10-01');
    expect(yucQ4?.value).toBe(165.5);
  });

  it('mapea trimestres numéricos y romanos al mismo quarter', () => {
    const buf = buildLongBuffer();
    const rows = parseShfWorkbook(buf);
    const nacQ1 = rows.find(
      (r) => r.series_id === 'ipv_nacional' && r.period_start === '2024-01-01',
    );
    const nacQ2 = rows.find(
      (r) => r.series_id === 'ipv_nacional' && r.period_start === '2024-04-01',
    );
    expect(nacQ1?.value).toBe(180.5);
    expect(nacQ2?.value).toBe(182.1);
  });
});

describe('parseShfWorkbook (edge cases)', () => {
  it('buffer vacío → []', () => {
    expect(parseShfWorkbook(Buffer.alloc(0))).toEqual([]);
  });

  it('workbook sin hojas reconocibles → []', () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['foo', 'bar'],
      [1, 2],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, 'junk');
    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown;
    const buf = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
    expect(parseShfWorkbook(buf)).toEqual([]);
  });
});

describe('shfDriver', () => {
  it('está registrado con source=shf, category=macro, periodicity=quarterly', () => {
    expect(shfDriver.source).toBe('shf');
    expect(shfDriver.category).toBe('macro');
    expect(shfDriver.defaultPeriodicity).toBe('quarterly');
  });

  it('fetch regresa el buffer provisto en input', async () => {
    const buf = buildWideBuffer();
    const ctx = {
      runId: 'r',
      source: 'shf',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const out = await shfDriver.fetch(ctx, { buffer: buf });
    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out.length).toBe(buf.length);
  });

  it('fetch rechaza buffer ausente', async () => {
    const ctx = {
      runId: 'r',
      source: 'shf',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(shfDriver.fetch(ctx, { buffer: Buffer.alloc(0) })).rejects.toThrow(
      'shf_missing_buffer',
    );
  });

  it('parse produce array no vacío para workbook wide', async () => {
    const buf = buildWideBuffer();
    const ctx = {
      runId: 'r',
      source: 'shf',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const rows = await shfDriver.parse(buf, ctx);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });
});
