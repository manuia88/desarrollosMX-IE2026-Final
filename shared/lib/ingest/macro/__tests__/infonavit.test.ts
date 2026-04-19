import { describe, expect, it } from 'vitest';
import {
  detectInfonavitDataset,
  INFONAVIT_ENTIDAD_CVE,
  INFONAVIT_HEADER_MAP_A,
  INFONAVIT_HEADER_MAP_B,
  INFONAVIT_PERIODICITY,
  infonavitDriver,
  normalizeHeader,
  parseCsvLine,
  parseInfonavitCsv,
  parseInfonavitPeriod,
  parseInfonavitValue,
  slugify,
} from '../infonavit';

describe('INFONAVIT_ENTIDAD_CVE', () => {
  it('incluye 32 entidades + nacional (reusa SHF map)', () => {
    expect(INFONAVIT_ENTIDAD_CVE.Nacional).toBe('00');
    expect(INFONAVIT_ENTIDAD_CVE.Aguascalientes).toBe('01');
    expect(INFONAVIT_ENTIDAD_CVE['Ciudad de México']).toBe('09');
    expect(INFONAVIT_ENTIDAD_CVE['Nuevo León']).toBe('19');
    expect(INFONAVIT_ENTIDAD_CVE.Zacatecas).toBe('32');
    const uniques = new Set(Object.values(INFONAVIT_ENTIDAD_CVE));
    expect(uniques.size).toBe(33);
  });
});

describe('INFONAVIT_HEADER_MAP_A / B', () => {
  it('expone claves canónicas esperadas', () => {
    expect(INFONAVIT_HEADER_MAP_A.periodo).toBe('periodo');
    expect(INFONAVIT_HEADER_MAP_A.delegacion).toBe('delegacion');
    expect(INFONAVIT_HEADER_MAP_A.valor_vivienda_promedio_mdp).toBe('valor_vivienda_promedio_mdp');
    expect(INFONAVIT_HEADER_MAP_B.tipo_credito).toBe('tipo_credito');
    expect(INFONAVIT_HEADER_MAP_B.monto_mdp).toBe('monto_mdp');
  });
});

describe('normalizeHeader / slugify', () => {
  it('normaliza acentos, espacios, case', () => {
    expect(normalizeHeader('Entidad Federativa')).toBe('entidad_federativa');
    expect(normalizeHeader('Delegación')).toBe('delegacion');
    expect(normalizeHeader('  Créditos Otorgados  ')).toBe('creditos_otorgados');
  });

  it('slugify produce tokens a-z0-9_', () => {
    expect(slugify('Monterrey Centro')).toBe('monterrey_centro');
    expect(slugify('CrediTerreno')).toBe('crediterreno');
    expect(slugify('Mejorahogar 2.0')).toBe('mejorahogar_2_0');
  });
});

describe('parseCsvLine', () => {
  it('respeta comillas con comas internas', () => {
    const cols = parseCsvLine('2025-03,"Nuevo León","Monterrey, Centro",1234,567.89');
    expect(cols).toEqual(['2025-03', 'Nuevo León', 'Monterrey, Centro', '1234', '567.89']);
  });

  it('soporta dobles comillas escapadas', () => {
    const cols = parseCsvLine('"a""b",c,d');
    expect(cols).toEqual(['a"b', 'c', 'd']);
  });
});

describe('detectInfonavitDataset', () => {
  it('detecta Dataset A con headers canónicos', () => {
    expect(
      detectInfonavitDataset([
        'periodo',
        'entidad',
        'delegacion',
        'creditos_otorgados',
        'monto_mdp',
        'valor_vivienda_promedio_mdp',
      ]),
    ).toBe('A');
  });

  it('detecta Dataset A con headers alias (Estado, Municipio, Monto Otorgado MDP)', () => {
    expect(
      detectInfonavitDataset([
        'Periodo',
        'Estado',
        'Municipio',
        'Créditos Otorgados',
        'Monto Otorgado MDP',
        'Valor Vivienda Promedio',
      ]),
    ).toBe('A');
  });

  it('detecta Dataset B con headers canónicos', () => {
    expect(
      detectInfonavitDataset(['periodo', 'tipo_credito', 'creditos_otorgados', 'monto_mdp']),
    ).toBe('B');
  });

  it('detecta Dataset B con alias (Tipo, Producto, Monto)', () => {
    expect(detectInfonavitDataset(['Fecha', 'Tipo', 'Creditos', 'Monto'])).toBe('B');
  });

  it('regresa null para headers no reconocibles', () => {
    expect(detectInfonavitDataset(['foo', 'bar', 'baz'])).toBeNull();
    expect(detectInfonavitDataset([])).toBeNull();
    expect(detectInfonavitDataset(['periodo'])).toBeNull();
  });
});

describe('parseInfonavitPeriod', () => {
  it('parsea YYYY-MM', () => {
    expect(parseInfonavitPeriod('2025-03')).toEqual({
      period_start: '2025-03-01',
      period_end: '2025-03-31',
    });
  });

  it('parsea MM/YYYY', () => {
    expect(parseInfonavitPeriod('03/2025')).toEqual({
      period_start: '2025-03-01',
      period_end: '2025-03-31',
    });
  });

  it('parsea YYYY-MM-DD extrayendo mes', () => {
    expect(parseInfonavitPeriod('2025-02-15')).toEqual({
      period_start: '2025-02-01',
      period_end: '2025-02-28',
    });
  });

  it('parsea nombre de mes en español', () => {
    expect(parseInfonavitPeriod('enero 2025')).toEqual({
      period_start: '2025-01-01',
      period_end: '2025-01-31',
    });
    expect(parseInfonavitPeriod('dic-2025')).toEqual({
      period_start: '2025-12-01',
      period_end: '2025-12-31',
    });
  });

  it('regresa null para inputs inválidos', () => {
    expect(parseInfonavitPeriod('')).toBeNull();
    expect(parseInfonavitPeriod(null)).toBeNull();
    expect(parseInfonavitPeriod('abc')).toBeNull();
    expect(parseInfonavitPeriod('2025-13')).toBeNull();
  });
});

describe('parseInfonavitValue', () => {
  it('parsea números y strings numéricos', () => {
    expect(parseInfonavitValue(1234.56)).toBe(1234.56);
    expect(parseInfonavitValue('1,234.56')).toBeCloseTo(1234.56);
  });

  it('regresa null para N/D, vacío, guión', () => {
    expect(parseInfonavitValue('N/D')).toBeNull();
    expect(parseInfonavitValue('')).toBeNull();
    expect(parseInfonavitValue('-')).toBeNull();
  });
});

describe('parseInfonavitCsv — Dataset A', () => {
  const csvA = [
    'periodo,entidad,delegacion,creditos_otorgados,monto_mdp,valor_vivienda_promedio_mdp',
    '2025-03,Nuevo León,Monterrey Centro,1500,850.5,0.65',
    '2025-03,Jalisco,Guadalajara Norte,1200,720.3,0.58',
    '2025-03,Ciudad de México,CDMX Sur,900,1100.0,1.20',
  ].join('\n');

  it('genera 3 métricas × N delegaciones (3N rows)', () => {
    const rows = parseInfonavitCsv(csvA);
    expect(rows.length).toBe(9); // 3 delegaciones × 3 métricas
  });

  it('mapea entidad → cve INEGI correctamente', () => {
    const rows = parseInfonavitCsv(csvA);
    const nlCreditos = rows.find(
      (r) =>
        r.metric_name === 'creditos_otorgados' && r.series_id === 'creditos_19_monterrey_centro',
    );
    expect(nlCreditos?.value).toBe(1500);
    expect(nlCreditos?.unit).toBe('count');
    expect(nlCreditos?.period_start).toBe('2025-03-01');
    expect(nlCreditos?.period_end).toBe('2025-03-31');

    const cdmxValor = rows.find(
      (r) =>
        r.metric_name === 'valor_vivienda_promedio' && r.series_id === 'valor_vivienda_09_cdmx_sur',
    );
    expect(cdmxValor?.value).toBe(1.2);
    expect(cdmxValor?.unit).toBe('MXN_mdp');
  });

  it('produce source_span con dataset=A, cve, raw_row_index', () => {
    const rows = parseInfonavitCsv(csvA);
    const first = rows[0];
    expect(first).toBeDefined();
    expect(first?.source_span.dataset).toBe('A');
    if (first?.source_span.dataset === 'A') {
      expect(first.source_span.cve).toMatch(/^\d{2}$/);
      expect(typeof first.source_span.raw_row_index).toBe('number');
      expect(first.source_span.raw_headers.length).toBeGreaterThan(0);
      expect(first.source_span.entidad_o_tipo.length).toBeGreaterThan(0);
    }
  });

  it('metric_name correcto y unit mapeado', () => {
    const rows = parseInfonavitCsv(csvA);
    const metrics = new Set(rows.map((r) => r.metric_name));
    expect(metrics).toEqual(
      new Set(['creditos_otorgados', 'monto_otorgado', 'valor_vivienda_promedio']),
    );
    for (const r of rows) {
      if (r.metric_name === 'creditos_otorgados') expect(r.unit).toBe('count');
      else expect(r.unit).toBe('MXN_mdp');
      expect(r.periodicity).toBe(INFONAVIT_PERIODICITY);
    }
  });
});

describe('parseInfonavitCsv — Dataset B', () => {
  const csvB = [
    'periodo,tipo_credito,creditos_otorgados,monto_mdp',
    '2025-03,Tradicional,5000,3200.0',
    '2025-03,CrediTerreno,800,450.5',
    '2025-03,Mejorahogar,2000,600.0',
  ].join('\n');

  it('genera 2 métricas × N tipos (2N rows)', () => {
    const rows = parseInfonavitCsv(csvB);
    expect(rows.length).toBe(6); // 3 tipos × 2 métricas
  });

  it('slug tipo_credito correcto en series_id', () => {
    const rows = parseInfonavitCsv(csvB);
    const tradCred = rows.find((r) => r.series_id === 'creditos_tipo_tradicional');
    expect(tradCred?.value).toBe(5000);
    expect(tradCred?.metric_name).toBe('creditos_otorgados');

    const credTerrMonto = rows.find((r) => r.series_id === 'monto_tipo_crediterreno');
    expect(credTerrMonto?.value).toBe(450.5);
    expect(credTerrMonto?.metric_name).toBe('monto_otorgado');
    expect(credTerrMonto?.unit).toBe('MXN_mdp');
  });

  it('source_span dataset=B con cve null', () => {
    const rows = parseInfonavitCsv(csvB);
    const first = rows[0];
    expect(first?.source_span.dataset).toBe('B');
    if (first?.source_span.dataset === 'B') {
      expect(first.source_span.cve).toBeNull();
      expect(first.source_span.entidad_o_tipo.length).toBeGreaterThan(0);
    }
  });
});

describe('parseInfonavitCsv — errores', () => {
  it('throw "infonavit_csv_headers_not_recognized" para headers ajenos', () => {
    const bad = 'foo,bar,baz\n1,2,3\n';
    expect(() => parseInfonavitCsv(bad)).toThrow('infonavit_csv_headers_not_recognized');
  });

  it('csvText vacío → []', () => {
    expect(parseInfonavitCsv('')).toEqual([]);
    expect(parseInfonavitCsv('   ')).toEqual([]);
  });
});

describe('infonavitDriver', () => {
  it('está registrado con source=infonavit, category=macro, periodicity=monthly', () => {
    expect(infonavitDriver.source).toBe('infonavit');
    expect(infonavitDriver.category).toBe('macro');
    expect(infonavitDriver.defaultPeriodicity).toBe('monthly');
  });

  it('fetch regresa el csvText provisto en input', async () => {
    const ctx = {
      runId: 'r',
      source: 'infonavit',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = 'periodo,entidad,delegacion,creditos_otorgados,monto_mdp\n2025-03,Jalisco,GDL,10,5';
    const out = await infonavitDriver.fetch(ctx, { csvText: csv });
    expect(out).toBe(csv);
  });

  it('fetch rechaza csvText vacío', async () => {
    const ctx = {
      runId: 'r',
      source: 'infonavit',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(infonavitDriver.fetch(ctx, { csvText: '' })).rejects.toThrow(
      'infonavit_missing_csv',
    );
  });

  it('parse produce array no vacío para CSV Dataset A válido', async () => {
    const ctx = {
      runId: 'r',
      source: 'infonavit',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const csv = [
      'periodo,entidad,delegacion,creditos_otorgados,monto_mdp,valor_vivienda_promedio_mdp',
      '2025-03,Jalisco,Guadalajara,100,50.0,0.5',
    ].join('\n');
    const rows = await infonavitDriver.parse(csv, ctx);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(3); // 3 métricas para 1 delegación
  });
});
