import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapBanxicoRowsToMacroSeries,
  mapInegiRowsToMacroSeries,
  parseBanxicoDate,
  parseBanxicoResponse,
  parseInegiBieResponse,
} from '../02_ingest-macro-banxico-inegi.ts';

describe('parseBanxicoDate', () => {
  it("convierte '01/03/2026' a '2026-03-01' (DD/MM/YYYY → ISO)", () => {
    expect(parseBanxicoDate('01/03/2026')).toBe('2026-03-01');
  });

  it("edge case: '31/12/2025' → '2025-12-31'", () => {
    expect(parseBanxicoDate('31/12/2025')).toBe('2025-12-31');
  });

  it('throws si formato inválido', () => {
    expect(() => parseBanxicoDate('2026-01-01')).toThrow();
    expect(() => parseBanxicoDate('1/1/2026')).toThrow();
    expect(() => parseBanxicoDate('garbage')).toThrow();
    expect(() => parseBanxicoDate('')).toThrow();
  });
});

describe('parseBanxicoResponse', () => {
  it('parsea happy path: 2 series × 3 datos', () => {
    const mock = {
      bmx: {
        series: [
          {
            idSerie: 'SF43718',
            titulo: 'FX',
            datos: [
              { fecha: '01/03/2026', dato: '20.1234' },
              { fecha: '02/03/2026', dato: '20.3456' },
              { fecha: '03/03/2026', dato: '20.5678' },
            ],
          },
          {
            idSerie: 'SF60648',
            titulo: 'Tasa',
            datos: [
              { fecha: '01/03/2026', dato: '10.50' },
              { fecha: '02/03/2026', dato: '10.50' },
              { fecha: '03/03/2026', dato: '10.25' },
            ],
          },
        ],
      },
    };
    const rows = parseBanxicoResponse(mock);
    expect(rows).toHaveLength(6);
    const first = rows[0];
    expect(first).toBeDefined();
    if (first == null) return;
    expect(first.series_id).toBe('SF43718');
    expect(first.period_start).toBe('2026-03-01');
    expect(first.period_end).toBe('2026-03-01');
    expect(first.value).toBeCloseTo(20.1234, 4);
  });

  it("skippea 'N/E' values y vacíos", () => {
    const mock = {
      bmx: {
        series: [
          {
            idSerie: 'SF43718',
            datos: [
              { fecha: '01/03/2026', dato: '20.1234' },
              { fecha: '02/03/2026', dato: 'N/E' },
              { fecha: '03/03/2026', dato: '' },
              { fecha: '04/03/2026', dato: '20.55' },
            ],
          },
        ],
      },
    };
    const rows = parseBanxicoResponse(mock);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.period_start).toBe('2026-03-01');
    expect(rows[1]?.period_start).toBe('2026-03-04');
  });

  it('JSON vacío o malformado → array vacío', () => {
    expect(parseBanxicoResponse(null)).toEqual([]);
    expect(parseBanxicoResponse(undefined)).toEqual([]);
    expect(parseBanxicoResponse({})).toEqual([]);
    expect(parseBanxicoResponse({ bmx: {} })).toEqual([]);
    expect(parseBanxicoResponse({ bmx: { series: 'not-array' } })).toEqual([]);
    expect(parseBanxicoResponse('garbage')).toEqual([]);
  });

  it('skippea fechas con formato inválido sin abortar', () => {
    const mock = {
      bmx: {
        series: [
          {
            idSerie: 'SF43718',
            datos: [
              { fecha: 'bad-date', dato: '20.1' },
              { fecha: '01/03/2026', dato: '20.2' },
            ],
          },
        ],
      },
    };
    const rows = parseBanxicoResponse(mock);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBeCloseTo(20.2, 4);
  });
});

describe('parseInegiBieResponse', () => {
  it('monthly YYYY/MM parsing correcto (period_start=1ro, period_end=último día)', () => {
    const mock = {
      Series: [
        {
          INDICADOR: '628194',
          OBSERVATIONS: [
            { TIME_PERIOD: '2026/01', OBS_VALUE: '128.34', COBER_GEO: '0700' },
            { TIME_PERIOD: '2026/02', OBS_VALUE: '128.90', COBER_GEO: '0700' },
            { TIME_PERIOD: '2024/02', OBS_VALUE: '125.00', COBER_GEO: '0700' }, // feb bisiesto
          ],
        },
      ],
    };
    const rows = parseInegiBieResponse(mock, '628194');
    expect(rows).toHaveLength(3);
    const jan = rows[0];
    expect(jan).toBeDefined();
    if (jan == null) return;
    expect(jan.period_start).toBe('2026-01-01');
    expect(jan.period_end).toBe('2026-01-31');
    expect(jan.periodicity).toBe('monthly');
    expect(jan.value).toBeCloseTo(128.34, 2);

    const feb2026 = rows[1];
    expect(feb2026?.period_end).toBe('2026-02-28'); // 2026 no bisiesto

    const feb2024 = rows[2];
    expect(feb2024?.period_end).toBe('2024-02-29'); // 2024 bisiesto
  });

  it('quarterly YYYY/Q parsing (Q1=Ene-Mar, Q4=Oct-Dic)', () => {
    const mock = {
      Series: [
        {
          INDICADOR: '736182',
          OBSERVATIONS: [
            { TIME_PERIOD: '2025/1', OBS_VALUE: '27500000' },
            { TIME_PERIOD: '2025/4', OBS_VALUE: '28200000' },
          ],
        },
      ],
    };
    const rows = parseInegiBieResponse(mock, '736182');
    expect(rows).toHaveLength(2);
    const q1 = rows[0];
    const q4 = rows[1];
    expect(q1).toBeDefined();
    expect(q4).toBeDefined();
    if (q1 == null || q4 == null) return;
    expect(q1.period_start).toBe('2025-01-01');
    expect(q1.period_end).toBe('2025-03-31');
    expect(q1.periodicity).toBe('quarterly');
    expect(q4.period_start).toBe('2025-10-01');
    expect(q4.period_end).toBe('2025-12-31');
    expect(q4.periodicity).toBe('quarterly');
  });

  it("también acepta 'Q1'..'Q4' con prefijo", () => {
    const mock = {
      Series: [
        {
          OBSERVATIONS: [{ TIME_PERIOD: '2025/Q2', OBS_VALUE: '100' }],
        },
      ],
    };
    const rows = parseInegiBieResponse(mock, '999');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.period_start).toBe('2025-04-01');
    expect(rows[0]?.period_end).toBe('2025-06-30');
    expect(rows[0]?.periodicity).toBe('quarterly');
  });

  it("yearly 'YYYY' parsing", () => {
    const mock = {
      Series: [
        {
          OBSERVATIONS: [{ TIME_PERIOD: '2024', OBS_VALUE: '55.5' }],
        },
      ],
    };
    const rows = parseInegiBieResponse(mock, '123');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.period_start).toBe('2024-01-01');
    expect(rows[0]?.period_end).toBe('2024-12-31');
    expect(rows[0]?.periodicity).toBe('yearly');
  });

  it('skippea OBS_VALUE null/vacío/no numérico', () => {
    const mock = {
      Series: [
        {
          OBSERVATIONS: [
            { TIME_PERIOD: '2026/01', OBS_VALUE: null },
            { TIME_PERIOD: '2026/02', OBS_VALUE: '' },
            { TIME_PERIOD: '2026/03', OBS_VALUE: 'abc' },
            { TIME_PERIOD: '2026/04', OBS_VALUE: '128.5' },
          ],
        },
      ],
    };
    const rows = parseInegiBieResponse(mock, '628194');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.period_start).toBe('2026-04-01');
  });

  it('JSON vacío o malformado → array vacío', () => {
    expect(parseInegiBieResponse(null, 'x')).toEqual([]);
    expect(parseInegiBieResponse({}, 'x')).toEqual([]);
    expect(parseInegiBieResponse({ Series: 'not-array' }, 'x')).toEqual([]);
  });
});

describe('mapBanxicoRowsToMacroSeries', () => {
  it('incluye todos los campos required + runId + periodicity=daily', () => {
    const rows = [
      { series_id: 'SF43718', period_start: '2026-03-01', period_end: '2026-03-01', value: 20.12 },
      { series_id: 'SF43718', period_start: '2026-03-02', period_end: '2026-03-02', value: 20.34 },
      { series_id: 'OTHER', period_start: '2026-03-02', period_end: '2026-03-02', value: 99 },
    ];
    const mapped = mapBanxicoRowsToMacroSeries(rows, {
      seriesId: 'SF43718',
      metricName: 'FX_USD_MXN',
      unit: 'MXN per USD',
      source: 'banxico',
      countryCode: 'MX',
      runId: 'run-abc',
    });
    expect(mapped).toHaveLength(2);
    const first = mapped[0];
    expect(first).toBeDefined();
    if (first == null) return;
    expect(first.country_code).toBe('MX');
    expect(first.source).toBe('banxico');
    expect(first.series_id).toBe('SF43718');
    expect(first.metric_name).toBe('FX_USD_MXN');
    expect(first.unit).toBe('MXN per USD');
    expect(first.periodicity).toBe('daily');
    expect(first.period_start).toBe('2026-03-01');
    expect(first.period_end).toBe('2026-03-01');
    expect(first.run_id).toBe('run-abc');
    expect(first.value).toBeCloseTo(20.12, 2);
  });

  it('filtra rows que no coinciden con el seriesId configurado', () => {
    const rows = [
      { series_id: 'OTHER', period_start: '2026-03-01', period_end: '2026-03-01', value: 1 },
    ];
    const mapped = mapBanxicoRowsToMacroSeries(rows, {
      seriesId: 'SF43718',
      metricName: 'FX_USD_MXN',
      unit: 'MXN per USD',
      source: 'banxico',
      countryCode: 'MX',
      runId: 'run-abc',
    });
    expect(mapped).toEqual([]);
  });
});

describe('mapInegiRowsToMacroSeries', () => {
  it('preserva periodicity por row (monthly vs quarterly mezclados)', () => {
    const rows: Array<{
      period_start: string;
      period_end: string;
      value: number;
      periodicity: 'monthly' | 'quarterly' | 'yearly';
    }> = [
      {
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        value: 128.3,
        periodicity: 'monthly',
      },
      {
        period_start: '2025-10-01',
        period_end: '2025-12-31',
        value: 28_200_000,
        periodicity: 'quarterly',
      },
    ];
    const mapped = mapInegiRowsToMacroSeries(rows, {
      seriesId: '628194',
      metricName: 'INPC_GENERAL',
      unit: 'index',
      source: 'inegi_inpc',
      countryCode: 'MX',
      runId: 'run-xyz',
    });
    expect(mapped).toHaveLength(2);
    expect(mapped[0]?.periodicity).toBe('monthly');
    expect(mapped[1]?.periodicity).toBe('quarterly');
    expect(mapped[0]?.source).toBe('inegi_inpc');
    expect(mapped[0]?.metric_name).toBe('INPC_GENERAL');
    expect(mapped[0]?.run_id).toBe('run-xyz');
  });
});

describe('integration: fetch mocked', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parseBanxicoResponse pipeline end-to-end con fetch mockeado', async () => {
    const fakeJson = {
      bmx: {
        series: [
          {
            idSerie: 'SF43718',
            datos: [{ fecha: '01/03/2026', dato: '20.5' }],
          },
        ],
      },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(fakeJson), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await fetch(
      'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/2026-01-01/2026-03-01',
      { headers: { 'Bmx-Token': 'test-token' } },
    );
    const json = (await res.json()) as unknown;
    const rows = parseBanxicoResponse(json);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs).toBeDefined();
    if (callArgs == null) return;
    const [urlArg, initArg] = callArgs;
    expect(String(urlArg)).toContain('banxico.org.mx');
    expect(String(urlArg)).toContain('SF43718');
    const init = initArg as RequestInit | undefined;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Bmx-Token']).toBe('test-token');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBeCloseTo(20.5, 2);
    expect(rows[0]?.period_start).toBe('2026-03-01');
  });
});
