import { describe, expect, it, vi } from 'vitest';
import {
  fetchInegiSeries,
  INEGI_SERIES,
  type InegiApiPayload,
  inegiDriver,
  parseInegiPayload,
  parseInegiPeriod,
  parseInegiValue,
} from '../inegi';

const samplePayload: InegiApiPayload = {
  Series: [
    {
      INDICADOR: INEGI_SERIES.INPC_GEN.id,
      OBSERVATIONS: [
        { TIME_PERIOD: '2024/06', OBS_VALUE: '135.50' },
        { TIME_PERIOD: '2024/07', OBS_VALUE: '136.10' },
        { TIME_PERIOD: '2024/08', OBS_VALUE: 'N/E' },
      ],
    },
    {
      INDICADOR: INEGI_SERIES.PIB_REAL.id,
      OBSERVATIONS: [
        { TIME_PERIOD: '2024/02', OBS_VALUE: '21500000.0' },
        { TIME_PERIOD: '2024/03', OBS_VALUE: '21800000.0' },
      ],
    },
    {
      INDICADOR: '999999',
      OBSERVATIONS: [{ TIME_PERIOD: '2024/06', OBS_VALUE: '1.0' }],
    },
  ],
};

describe('parseInegiPeriod', () => {
  it('parsea mensual YYYY/MM a start/end del mes', () => {
    expect(parseInegiPeriod('2024/06', 'monthly')).toEqual({
      period_start: '2024-06-01',
      period_end: '2024-06-30',
    });
    expect(parseInegiPeriod('2024/02', 'monthly')).toEqual({
      period_start: '2024-02-01',
      period_end: '2024-02-29',
    });
    expect(parseInegiPeriod('2023/02', 'monthly')).toEqual({
      period_start: '2023-02-01',
      period_end: '2023-02-28',
    });
    expect(parseInegiPeriod('2024/12', 'monthly')).toEqual({
      period_start: '2024-12-01',
      period_end: '2024-12-31',
    });
  });

  it('parsea trimestral YYYY/TT (Q1..Q4)', () => {
    expect(parseInegiPeriod('2024/01', 'quarterly')).toEqual({
      period_start: '2024-01-01',
      period_end: '2024-03-31',
    });
    expect(parseInegiPeriod('2024/02', 'quarterly')).toEqual({
      period_start: '2024-04-01',
      period_end: '2024-06-30',
    });
    expect(parseInegiPeriod('2024/03', 'quarterly')).toEqual({
      period_start: '2024-07-01',
      period_end: '2024-09-30',
    });
    expect(parseInegiPeriod('2024/04', 'quarterly')).toEqual({
      period_start: '2024-10-01',
      period_end: '2024-12-31',
    });
  });

  it('parsea anual YYYY', () => {
    expect(parseInegiPeriod('2024', 'yearly')).toEqual({
      period_start: '2024-01-01',
      period_end: '2024-12-31',
    });
  });

  it('rechaza formatos inválidos', () => {
    expect(parseInegiPeriod('2024-06', 'monthly')).toBeNull();
    expect(parseInegiPeriod('', 'monthly')).toBeNull();
    expect(parseInegiPeriod('2024/13', 'monthly')).toBeNull();
    expect(parseInegiPeriod('2024/05', 'quarterly')).toBeNull();
    expect(parseInegiPeriod('2024/06', 'yearly')).toBeNull();
    expect(parseInegiPeriod('abc', 'monthly')).toBeNull();
  });
});

describe('parseInegiValue', () => {
  it('parsea números válidos', () => {
    expect(parseInegiValue('135.50')).toBeCloseTo(135.5);
    expect(parseInegiValue('21500000.0')).toBe(21500000);
    expect(parseInegiValue('1,234.56')).toBeCloseTo(1234.56);
  });

  it('rechaza valores no-disponibles', () => {
    expect(parseInegiValue('N/E')).toBeNull();
    expect(parseInegiValue('NE')).toBeNull();
    expect(parseInegiValue('nd')).toBeNull();
    expect(parseInegiValue('')).toBeNull();
    expect(parseInegiValue(null)).toBeNull();
    expect(parseInegiValue(undefined)).toBeNull();
    expect(parseInegiValue('abc')).toBeNull();
  });
});

describe('parseInegiPayload', () => {
  it('mapea INDICADORes conocidos y filtra desconocidos', () => {
    const rows = parseInegiPayload(samplePayload);
    expect(rows).toHaveLength(4);
    const keys = rows.map((r) => `${r.metric_name}:${r.period_start}`).sort();
    expect(keys).toEqual([
      'INPC_GEN:2024-06-01',
      'INPC_GEN:2024-07-01',
      'PIB_REAL:2024-04-01',
      'PIB_REAL:2024-07-01',
    ]);
  });

  it('resuelve quarterly para PIB_REAL', () => {
    const rows = parseInegiPayload(samplePayload);
    const pibQ2 = rows.find((r) => r.metric_name === 'PIB_REAL' && r.period_start === '2024-04-01');
    expect(pibQ2?.period_end).toBe('2024-06-30');
    expect(pibQ2?.periodicity).toBe('quarterly');
    expect(pibQ2?.unit).toBe('MXN_millones_2013');
    expect(pibQ2?.value).toBe(21500000);
  });

  it('setea unit + periodicity desde registry', () => {
    const rows = parseInegiPayload(samplePayload);
    const inpc = rows.find((r) => r.metric_name === 'INPC_GEN');
    expect(inpc?.unit).toBe('index');
    expect(inpc?.periodicity).toBe('monthly');
  });

  it('preserva source_span para lineage Constitutional AI', () => {
    const rows = parseInegiPayload(samplePayload);
    const first = rows.find((r) => r.metric_name === 'INPC_GEN' && r.period_start === '2024-06-01');
    expect(first?.source_span.indicator_id).toBe(INEGI_SERIES.INPC_GEN.id);
    expect(first?.source_span.raw_time_period).toBe('2024/06');
    expect(first?.source_span.raw_obs_value).toBe('135.50');
  });

  it('tolera Series vacío o ausente', () => {
    expect(parseInegiPayload({ Series: [] })).toEqual([]);
    expect(parseInegiPayload({})).toEqual([]);
  });
});

describe('fetchInegiSeries', () => {
  it('arma URL con token en path y type=json', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => samplePayload,
    })) as unknown as typeof fetch;
    const out = await fetchInegiSeries(['910414', '628194'], {
      token: 'test-token-abc',
      runId: '00000000-0000-0000-0000-000000000002',
      fetchImpl: mockFetch,
    });
    expect(out.Series).toHaveLength(3);
    const callArgs = (mockFetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const url = callArgs?.[0] as string;
    expect(url).toContain('/jsonxml/INDICATOR/910414,628194/es/0700/false/BIE/2.0/test-token-abc');
    expect(url).toContain('?type=json');
    const init = callArgs?.[1] as { headers: Record<string, string> };
    expect(init.headers['X-Correlation-Id']).toBe('00000000-0000-0000-0000-000000000002');
  });

  it('throwea inegi_http_<status> si response no-ok', async () => {
    const mockFetch = vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(
      fetchInegiSeries(['910414'], {
        token: 't',
        runId: 'r',
        fetchImpl: mockFetch,
      }),
    ).rejects.toThrow('inegi_http_503');
  });

  it('throwea inegi_no_series cuando indicatorIds vacío', async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    await expect(
      fetchInegiSeries([], { token: 't', runId: 'r', fetchImpl: mockFetch }),
    ).rejects.toThrow('inegi_no_series');
  });
});

describe('inegiDriver', () => {
  it('está registrado con source=inegi y category=macro', () => {
    expect(inegiDriver.source).toBe('inegi');
    expect(inegiDriver.category).toBe('macro');
    expect(inegiDriver.defaultPeriodicity).toBe('monthly');
  });

  it('fetch throwea si INEGI_TOKEN falta', async () => {
    const orig = process.env.INEGI_TOKEN;
    delete process.env.INEGI_TOKEN;
    await expect(
      inegiDriver.fetch(
        {
          runId: 'r',
          source: 'inegi',
          countryCode: 'MX',
          samplePercentage: 100,
          triggeredBy: null,
          startedAt: new Date(),
        },
        undefined,
      ),
    ).rejects.toThrow(/INEGI_TOKEN/);
    if (orig !== undefined) process.env.INEGI_TOKEN = orig;
  });

  it('parse devuelve InegiParsedRow[]', async () => {
    const rows = await inegiDriver.parse(samplePayload, {
      runId: 'r',
      source: 'inegi',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    });
    expect(rows).toHaveLength(4);
  });
});
