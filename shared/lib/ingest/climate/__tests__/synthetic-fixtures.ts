// Test-only synthetic climate fixtures. Preserved post F1.B refactor for
// twin-engine + cosine-similarity unit tests that need deterministic
// MonthlyAggregate inputs without hitting NOAA / CONAGUA APIs.
//
// NOT used in production paths. Production reads real ingested rows from
// climate_monthly_aggregates (source='noaa'|'conagua'|'hybrid'). See
// shared/lib/ingest/climate/noaa.ts and conagua-smn.ts.

import type { MonthlyAggregate } from '@/features/climate-twin/types';
import { DEFAULT_HISTORY_YEARS } from '@/features/climate-twin/types';

export const HEURISTIC_FIXTURE_SOURCE = 'heuristic_v1' as const;

const CDMX_BASE_TEMP_C = 17.5;
const CDMX_BASE_RAINFALL_MM_MONTH = 70;
const CDMX_BASE_HUMIDITY = 55;

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function seasonalTempDelta(monthIndex0: number): number {
  return 4 * Math.sin(((monthIndex0 - 1) / 12) * 2 * Math.PI);
}

function seasonalRainMultiplier(monthIndex0: number): number {
  return 0.3 + 1.5 * Math.max(0, Math.sin(((monthIndex0 - 4) / 12) * 2 * Math.PI));
}

export function heuristicMonthlyAggregate(zoneId: string, yearMonth: string): MonthlyAggregate {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number.parseInt(yStr ?? '0', 10);
  const month = Number.parseInt(mStr ?? '1', 10);
  const monthIdx = month - 1;
  const hzone = hash01(zoneId);
  const hmonth = hash01(`${zoneId}-${yearMonth}`);

  const zoneTempBias = (hzone - 0.5) * 3;
  const zoneRainBias = 0.7 + hzone * 0.6;
  const ccDelta = (year - 2011) * 0.03;

  const tempAvg = CDMX_BASE_TEMP_C + seasonalTempDelta(monthIdx) + zoneTempBias + ccDelta;
  const tempMax = tempAvg + 5 + hmonth * 2;
  const tempMin = tempAvg - 5 - hmonth * 2;

  const rainfall = Math.max(
    0,
    CDMX_BASE_RAINFALL_MM_MONTH *
      seasonalRainMultiplier(monthIdx) *
      zoneRainBias *
      (0.7 + hmonth * 0.6),
  );

  const humidity = CDMX_BASE_HUMIDITY + seasonalTempDelta(monthIdx) + (hzone - 0.5) * 20;

  const extreme: Record<string, number> = {};
  if (tempMax > 28 + hmonth * 3) extreme.heat = 1;
  if (tempMin < 5) extreme.cold = 1;
  if (rainfall > 180) extreme.flood = 1;

  return {
    zone_id: zoneId,
    year_month: yearMonth,
    temp_avg: Math.round(tempAvg * 100) / 100,
    temp_max: Math.round(tempMax * 100) / 100,
    temp_min: Math.round(tempMin * 100) / 100,
    rainfall_mm: Math.round(rainfall * 10) / 10,
    humidity_avg: Math.round(humidity * 10) / 10,
    extreme_events_count: extreme,
    source: HEURISTIC_FIXTURE_SOURCE,
  };
}

export function generateMonthlyHistory(
  zoneId: string,
  historyYears: number = DEFAULT_HISTORY_YEARS,
): MonthlyAggregate[] {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const startYear = currentYear - historyYears;
  const out: MonthlyAggregate[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const maxMonth = y === currentYear ? currentMonth : 12;
    for (let m = 1; m <= maxMonth; m++) {
      const ym = `${y}-${String(m).padStart(2, '0')}-01`;
      out.push(heuristicMonthlyAggregate(zoneId, ym));
    }
  }
  return out;
}
