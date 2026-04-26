import { describe, expect, it } from 'vitest';
import {
  aggregateMonthlyFromDailies,
  CONAGUA_BASE_URL,
  CONAGUA_CDMX_KNOWN_STATIONS,
  CONAGUA_SOURCE,
  conaguaDriver,
  parseConaguaDailies,
} from '../conagua-smn';

const SAMPLE = `COMISIÓN NACIONAL DEL AGUA
COORDINACIÓN GENERAL DEL SERVICIO METEOROLÓGICO NACIONAL

FECHA\t\tPRECIP\tEVAP\tTMAX\tTMIN
\t\t(mm)\t(mm)\t(°C )\t(°C)

2024-01-01\t0\tNULO\t22\t9
2024-01-02\t1.5\t3.1\t20\t8
2024-01-03\t0\t2.6\t21\t10
2024-01-04\t30.0\tNULO\t19\t7
2024-01-05\tNULO\tNULO\tNULO\tNULO
2024-01-06\t0\t2.0\t23\t11
2024-01-07\t0\t2.0\t24\t10
2024-01-08\t0\t2.0\t22\t9
2024-01-09\t0\t2.0\t21\t9
2024-01-10\t0\t2.0\t22\t10
2024-01-11\t0\t2.0\t23\t11
2024-01-12\t0\t2.0\t24\t12
2024-01-13\t0\t2.0\t25\t13
2024-01-14\t0\t2.0\t26\t10
2024-01-15\t0\t2.0\t27\t9
2024-01-16\t0\t2.0\t28\t8
2024-01-17\t0\t2.0\t30\t11
2024-01-18\t0\t2.0\t31\t12
2024-01-19\t0\t2.0\t29\t13
`;

describe('CONAGUA SMN parser', () => {
  it('parses tab-delimited dailies, NULO → null, ISO date', () => {
    const out = parseConaguaDailies(SAMPLE);
    expect(out.length).toBe(19);
    expect(out[0]).toEqual({
      date: '2024-01-01',
      precip_mm: 0,
      evap_mm: null,
      tmax_c: 22,
      tmin_c: 9,
    });
    expect(out[4]).toEqual({
      date: '2024-01-05',
      precip_mm: null,
      evap_mm: null,
      tmax_c: null,
      tmin_c: null,
    });
  });

  it('skips header lines and tolerates blank rows', () => {
    const out = parseConaguaDailies(SAMPLE);
    for (const row of out) {
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('aggregateMonthlyFromDailies enforces 15-day minimum', () => {
    const dailies = parseConaguaDailies(SAMPLE);
    const months = aggregateMonthlyFromDailies('9020', dailies, '2024-01', '2024-12');
    expect(months.length).toBe(1);
    const m = months[0];
    expect(m).toBeDefined();
    if (!m) return;
    expect(m.year_month).toBe('2024-01-01');
    expect(m.station_id).toBe('9020');
    expect(m.humidity_avg).toBeNull();
    expect(m.temp_max).toBe(31);
    expect(m.temp_min).toBe(7);
    expect(m.rainfall_mm).toBeCloseTo(31.5, 1);
    expect(m.extreme_events_count.heavy_rain_days).toBe(1);
    expect(m.extreme_events_count.heat_days).toBeGreaterThan(0);
  });

  it('drops months with <15 valid daily rows', () => {
    const dailies = parseConaguaDailies(`FECHA\tPRECIP\tEVAP\tTMAX\tTMIN
2024-02-01\t0\t2\t20\t10
2024-02-02\t0\t2\t20\t10
`);
    const months = aggregateMonthlyFromDailies('9020', dailies, '2024-01', '2024-12');
    expect(months.length).toBe(0);
  });
});

describe('CONAGUA SMN driver', () => {
  it('exports source=conagua, category=geo, daily periodicity', () => {
    expect(conaguaDriver.source).toBe('conagua');
    expect(conaguaDriver.category).toBe('geo');
    expect(conaguaDriver.defaultPeriodicity).toBe('daily');
    expect(CONAGUA_SOURCE).toBe('conagua');
    expect(CONAGUA_BASE_URL).toContain('Normales_Climatologicas');
  });

  it('lists 13 CDMX known stations with coords', () => {
    expect(CONAGUA_CDMX_KNOWN_STATIONS.length).toBe(13);
    for (const s of CONAGUA_CDMX_KNOWN_STATIONS) {
      expect(s.source).toBe('conagua');
      expect(s.lat).toBeGreaterThan(19);
      expect(s.lat).toBeLessThan(20);
      expect(s.lng).toBeGreaterThan(-100);
      expect(s.lng).toBeLessThan(-99);
    }
  });
});
