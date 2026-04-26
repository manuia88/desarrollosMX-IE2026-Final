import { describe, expect, it } from 'vitest';
import {
  aggregateMonth,
  CDMX_CENTRAL_BBOX,
  groupDailyByYearMonth,
  NOAA_BASE_URL,
  NOAA_CDMX_KNOWN_STATIONS,
  NOAA_SOURCE,
  NoaaDataPointSchema,
  NoaaDataResponseSchema,
  NoaaStationsListResponseSchema,
  noaaDriver,
} from '../noaa';

describe('NOAA NCEI parser/aggregator', () => {
  it('aggregateMonth: max/min/avg/sum + extreme events', () => {
    const out = aggregateMonth([
      { date: '2024-01-01', TMAX: 28, TMIN: 8, PRCP: 0 },
      { date: '2024-01-02', TMAX: 30, TMIN: 4, PRCP: 30 },
      { date: '2024-01-03', TMAX: 31, TMIN: 6, PRCP: 0 },
      { date: '2024-01-04', TMAX: 25, TMIN: 10, PRCP: 1.5 },
    ]);
    expect(out.temp_max).toBe(31);
    expect(out.temp_min).toBe(4);
    expect(out.rainfall_mm).toBeCloseTo(31.5, 1);
    expect(out.humidity_avg).toBeNull();
    expect(out.extreme_events_count.heat_days).toBe(2);
    expect(out.extreme_events_count.cold_days).toBe(1);
    expect(out.extreme_events_count.heavy_rain_days).toBe(1);
  });

  it('aggregateMonth handles empty daily list', () => {
    const out = aggregateMonth([]);
    expect(out.temp_max).toBeNull();
    expect(out.temp_min).toBeNull();
    expect(out.rainfall_mm).toBeNull();
    expect(out.extreme_events_count).toEqual({});
  });

  it('groupDailyByYearMonth keeps QC-clean attributes only', () => {
    const points = [
      {
        date: '2024-01-01T00:00:00',
        datatype: 'TMAX' as const,
        station: 's1',
        attributes: ',,S,',
        value: 30,
      },
      {
        date: '2024-01-01T00:00:00',
        datatype: 'TMIN' as const,
        station: 's1',
        attributes: ',,S,',
        value: 5,
      },
      {
        date: '2024-01-02T00:00:00',
        datatype: 'TMAX' as const,
        station: 's1',
        attributes: ',Q,S,',
        value: 99,
      },
    ];
    const grouped = groupDailyByYearMonth(points);
    const month = grouped.get('2024-01-01');
    expect(month).toBeDefined();
    expect(month?.length).toBe(1);
    expect(month?.[0]?.TMAX).toBe(30);
  });
});

describe('NOAA NCEI Zod schemas', () => {
  it('parses sample stations list response', () => {
    const sample = {
      metadata: { resultset: { offset: 1, count: 1, limit: 1000 } },
      results: [
        {
          id: 'GHCND:MXM00076680',
          name: 'MEXICO CITY, MX',
          latitude: 19.4,
          longitude: -99.183,
          elevation: 2303,
          elevationUnit: 'METERS',
          datacoverage: 0.6144,
          mindate: '1973-01-02',
          maxdate: '2026-02-11',
        },
      ],
    };
    const parsed = NoaaStationsListResponseSchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it('parses sample data point', () => {
    const ok = NoaaDataPointSchema.safeParse({
      date: '2024-01-01T00:00:00',
      datatype: 'TMAX',
      station: 'GHCND:MXM00076680',
      attributes: ',,S,',
      value: 23.9,
    });
    expect(ok.success).toBe(true);
  });

  it('tolerates empty {} response (defaults results to [])', () => {
    const parsed = NoaaDataResponseSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.results).toEqual([]);
    }
  });
});

describe('NOAA NCEI driver', () => {
  it('exports source=noaa, category=macro, monthly periodicity', () => {
    expect(noaaDriver.source).toBe('noaa');
    expect(noaaDriver.category).toBe('macro');
    expect(noaaDriver.defaultPeriodicity).toBe('monthly');
    expect(NOAA_SOURCE).toBe('noaa');
    expect(NOAA_BASE_URL).toBe('https://www.ncdc.noaa.gov/cdo-web/api/v2');
  });

  it('lists 8 known active CDMX-area stations with bbox', () => {
    expect(NOAA_CDMX_KNOWN_STATIONS.length).toBe(8);
    for (const s of NOAA_CDMX_KNOWN_STATIONS) {
      expect(s.source).toBe('noaa');
      expect(s.lat).toBeGreaterThan(CDMX_CENTRAL_BBOX.southLat);
      expect(s.lat).toBeLessThan(CDMX_CENTRAL_BBOX.northLat);
      expect(s.lng).toBeGreaterThan(CDMX_CENTRAL_BBOX.westLng);
      expect(s.lng).toBeLessThan(CDMX_CENTRAL_BBOX.eastLng);
    }
  });
});
