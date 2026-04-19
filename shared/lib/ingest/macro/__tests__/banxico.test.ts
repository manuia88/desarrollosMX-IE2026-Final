import { describe, expect, it, vi } from 'vitest';
import {
  BANXICO_SERIES,
  type BanxicoApiPayload,
  banxicoDriver,
  fetchBanxicoSeries,
  parseBanxicoDate,
  parseBanxicoPayload,
  parseBanxicoValue,
} from '../banxico';

const samplePayload: BanxicoApiPayload = {
  bmx: {
    series: [
      {
        idSerie: BANXICO_SERIES.tasa_referencia.id,
        titulo: 'Tasa objetivo de referencia',
        datos: [
          { fecha: '15/04/2026', dato: '11.00' },
          { fecha: '16/04/2026', dato: '10.75' },
          { fecha: '17/04/2026', dato: 'N/E' },
        ],
      },
      {
        idSerie: BANXICO_SERIES.USD_MXN_FIX.id,
        titulo: 'Tipo de cambio FIX',
        datos: [
          { fecha: '16/04/2026', dato: '17.4520' },
          { fecha: '17/04/2026', dato: '17,523.5' },
        ],
      },
      {
        idSerie: 'SF99999',
        titulo: 'series_desconocida',
        datos: [{ fecha: '16/04/2026', dato: '1.0' }],
      },
    ],
  },
};

describe('parseBanxicoDate', () => {
  it('parsea DD/MM/YYYY a ISO', () => {
    expect(parseBanxicoDate('16/04/2026')).toBe('2026-04-16');
    expect(parseBanxicoDate('01/01/2020')).toBe('2020-01-01');
  });

  it('rechaza formatos inválidos', () => {
    expect(parseBanxicoDate('2026-04-16')).toBeNull();
    expect(parseBanxicoDate('')).toBeNull();
    expect(parseBanxicoDate('16-04-2026')).toBeNull();
    expect(parseBanxicoDate('99/99/2026')).toBeNull();
  });
});

describe('parseBanxicoValue', () => {
  it('parsea números válidos', () => {
    expect(parseBanxicoValue('11.00')).toBe(11);
    expect(parseBanxicoValue('17.4520')).toBeCloseTo(17.452);
    expect(parseBanxicoValue('1,234.56')).toBeCloseTo(1234.56);
  });

  it('rechaza valores no-disponibles', () => {
    expect(parseBanxicoValue('N/E')).toBeNull();
    expect(parseBanxicoValue('NE')).toBeNull();
    expect(parseBanxicoValue('nd')).toBeNull();
    expect(parseBanxicoValue('')).toBeNull();
    expect(parseBanxicoValue(null)).toBeNull();
    expect(parseBanxicoValue(undefined)).toBeNull();
    expect(parseBanxicoValue('abc')).toBeNull();
  });
});

describe('parseBanxicoPayload', () => {
  it('mapea series conocidas a rows', () => {
    const rows = parseBanxicoPayload(samplePayload);
    // tasa_referencia: 2 válidos (N/E filtrado). USD_MXN_FIX: 2. SF99999: ignorada.
    expect(rows).toHaveLength(4);
    const byMetric = new Map(rows.map((r) => [`${r.metric_name}:${r.period_start}`, r]));
    expect(byMetric.get('tasa_referencia:2026-04-15')?.value).toBe(11);
    expect(byMetric.get('tasa_referencia:2026-04-16')?.value).toBe(10.75);
    expect(byMetric.get('USD_MXN_FIX:2026-04-16')?.value).toBeCloseTo(17.452);
  });

  it('setea unit + periodicity desde el registry', () => {
    const rows = parseBanxicoPayload(samplePayload);
    const tasa = rows.find((r) => r.metric_name === 'tasa_referencia');
    expect(tasa?.unit).toBe('pct');
    expect(tasa?.periodicity).toBe('daily');
    const fix = rows.find((r) => r.metric_name === 'USD_MXN_FIX');
    expect(fix?.unit).toBe('MXN_per_USD');
  });

  it('preserva source_span para lineage Constitutional AI', () => {
    const rows = parseBanxicoPayload(samplePayload);
    const first = rows[0];
    expect(first?.source_span.id_serie).toBe(BANXICO_SERIES.tasa_referencia.id);
    expect(first?.source_span.raw_fecha).toBe('15/04/2026');
    expect(first?.source_span.raw_dato).toBe('11.00');
    expect(typeof first?.source_span.titulo).toBe('string');
  });

  it('tolera payload vacío', () => {
    expect(parseBanxicoPayload({ bmx: { series: [] } })).toEqual([]);
  });
});

describe('fetchBanxicoSeries', () => {
  it('arma URL /datos/oportuno cuando no hay rango', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => samplePayload,
    })) as unknown as typeof fetch;
    const out = await fetchBanxicoSeries(['SF43783', 'SF43718'], {
      token: 'test-token',
      runId: '00000000-0000-0000-0000-000000000001',
      fetchImpl: mockFetch,
    });
    expect(out.bmx.series).toHaveLength(3);
    const callArgs = (mockFetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(callArgs?.[0]).toContain('SF43783,SF43718/datos/oportuno');
    const init = callArgs?.[1] as { headers: Record<string, string> };
    expect(init.headers['Bmx-Token']).toBe('test-token');
    expect(init.headers['X-Correlation-Id']).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('arma URL con rango cuando se pasa fromDate + toDate', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => samplePayload,
    })) as unknown as typeof fetch;
    await fetchBanxicoSeries(['SF43783'], {
      token: 'x',
      runId: 'r',
      fromDate: '2026-01-01',
      toDate: '2026-04-18',
      fetchImpl: mockFetch,
    });
    const url = (mockFetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0];
    expect(url).toContain('/datos/2026-01-01/2026-04-18');
  });

  it('throwea banxico_http_<status> si response no-ok', async () => {
    const mockFetch = vi.fn(async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    await expect(
      fetchBanxicoSeries(['SF43783'], {
        token: 't',
        runId: 'r',
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow('banxico_http_429');
  });

  it('throwea banxico_no_series cuando seriesIds vacío', async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    await expect(
      fetchBanxicoSeries([], { token: 't', runId: 'r', fetchImpl: mockFetch }),
    ).rejects.toThrow('banxico_no_series');
  });
});

describe('banxicoDriver', () => {
  it('está registrado con source=banxico y category=macro', () => {
    expect(banxicoDriver.source).toBe('banxico');
    expect(banxicoDriver.category).toBe('macro');
    expect(banxicoDriver.defaultPeriodicity).toBe('daily');
  });

  it('fetch throwea si BANXICO_TOKEN falta', async () => {
    const orig = process.env.BANXICO_TOKEN;
    delete process.env.BANXICO_TOKEN;
    await expect(
      banxicoDriver.fetch(
        {
          runId: 'r',
          source: 'banxico',
          countryCode: 'MX',
          samplePercentage: 100,
          triggeredBy: null,
          startedAt: new Date(),
        },
        undefined,
      ),
    ).rejects.toThrow(/BANXICO_TOKEN/);
    if (orig !== undefined) process.env.BANXICO_TOKEN = orig;
  });

  it('parse devuelve BanxicoParsedRow[]', async () => {
    const rows = await banxicoDriver.parse(samplePayload, {
      runId: 'r',
      source: 'banxico',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    });
    expect(rows).toHaveLength(4);
  });
});
