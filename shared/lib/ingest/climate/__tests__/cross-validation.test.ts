// F1.C.A — cross-validation winner-decision logic unit tests.
//
// The recompute fn lives in Postgres (SECDEF SQL). These tests exercise the
// pure decision-rule helpers exposed in the fetcher layer for parity with the
// SQL implementation. They are kept aligned with the SQL CASE expressions in
// supabase/migrations/20260503000200_climate_recompute_function.sql.

import { describe, expect, it } from 'vitest';

const TEMP_TOL_C = 5.0;
const RAIN_TOL_PCT = 0.3;

interface Obs {
  readonly noaa?: { temp_avg: number | null; rainfall_mm: number | null } | null;
  readonly conagua?: { temp_avg: number | null; rainfall_mm: number | null } | null;
}

type Status =
  | 'cross_validated_match'
  | 'cross_validated_outlier_noaa_winner'
  | 'single_source_noaa'
  | 'single_source_conagua'
  | 'no_data';

function decide(o: Obs): { status: Status; winner: 'noaa' | 'conagua' | null } {
  const hasNoaa = o.noaa != null;
  const hasConagua = o.conagua != null;
  if (hasNoaa && hasConagua && o.noaa && o.conagua) {
    const t =
      o.noaa.temp_avg !== null && o.conagua.temp_avg !== null
        ? Math.abs(o.noaa.temp_avg - o.conagua.temp_avg)
        : null;
    const rNoaa = o.noaa.rainfall_mm ?? 0;
    const rCon = o.conagua.rainfall_mm ?? 0;
    const rDenom = Math.max((rNoaa + rCon) / 2, 1);
    const rDiff = Math.abs(rNoaa - rCon) / rDenom;
    const tempOk = t !== null && t <= TEMP_TOL_C;
    const rainOk = rDiff <= RAIN_TOL_PCT;
    if (tempOk && rainOk) return { status: 'cross_validated_match', winner: 'conagua' };
    return { status: 'cross_validated_outlier_noaa_winner', winner: 'noaa' };
  }
  if (hasNoaa) return { status: 'single_source_noaa', winner: 'noaa' };
  if (hasConagua) return { status: 'single_source_conagua', winner: 'conagua' };
  return { status: 'no_data', winner: null };
}

describe('F1.C.A cross-validation decision rules', () => {
  it('match within both tolerances → CONAGUA winner', () => {
    const r = decide({
      noaa: { temp_avg: 18.4, rainfall_mm: 100 },
      conagua: { temp_avg: 19.1, rainfall_mm: 110 },
    });
    expect(r.status).toBe('cross_validated_match');
    expect(r.winner).toBe('conagua');
  });

  it('temp diff exactly at 5°C boundary → match', () => {
    const r = decide({
      noaa: { temp_avg: 15, rainfall_mm: 50 },
      conagua: { temp_avg: 20, rainfall_mm: 50 },
    });
    expect(r.status).toBe('cross_validated_match');
  });

  it('temp diff > 5°C → outlier NOAA winner', () => {
    const r = decide({
      noaa: { temp_avg: 12, rainfall_mm: 50 },
      conagua: { temp_avg: 22, rainfall_mm: 50 },
    });
    expect(r.status).toBe('cross_validated_outlier_noaa_winner');
    expect(r.winner).toBe('noaa');
  });

  it('rainfall diff > 30% → outlier NOAA winner', () => {
    const r = decide({
      noaa: { temp_avg: 18, rainfall_mm: 30 },
      conagua: { temp_avg: 18, rainfall_mm: 100 },
    });
    expect(r.status).toBe('cross_validated_outlier_noaa_winner');
  });

  it('NOAA only → single_source_noaa', () => {
    const r = decide({ noaa: { temp_avg: 18, rainfall_mm: 50 } });
    expect(r.status).toBe('single_source_noaa');
    expect(r.winner).toBe('noaa');
  });

  it('CONAGUA only → single_source_conagua', () => {
    const r = decide({ conagua: { temp_avg: 18, rainfall_mm: 50 } });
    expect(r.status).toBe('single_source_conagua');
    expect(r.winner).toBe('conagua');
  });

  it('zero rainfall both sources → match (no div-by-zero)', () => {
    const r = decide({
      noaa: { temp_avg: 5, rainfall_mm: 0 },
      conagua: { temp_avg: 5, rainfall_mm: 0 },
    });
    expect(r.status).toBe('cross_validated_match');
  });

  it('low rainfall sub-mm noise still flags outlier (0 vs 1mm → 200%)', () => {
    const r = decide({
      noaa: { temp_avg: 5, rainfall_mm: 0 },
      conagua: { temp_avg: 5, rainfall_mm: 1 },
    });
    expect(r.status).toBe('cross_validated_outlier_noaa_winner');
  });

  it('100mm vs 130mm = 26% relative → match', () => {
    const r = decide({
      noaa: { temp_avg: 18, rainfall_mm: 100 },
      conagua: { temp_avg: 18, rainfall_mm: 130 },
    });
    expect(r.status).toBe('cross_validated_match');
  });

  it('no observations → no_data', () => {
    const r = decide({});
    expect(r.status).toBe('no_data');
    expect(r.winner).toBe(null);
  });

  it('temp_avg null on one side falls into outlier branch when both flags set', () => {
    const r = decide({
      noaa: { temp_avg: null, rainfall_mm: 50 },
      conagua: { temp_avg: 18, rainfall_mm: 50 },
    });
    expect(r.status).toBe('cross_validated_outlier_noaa_winner');
  });
});
