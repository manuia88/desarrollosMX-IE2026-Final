import { describe, expect, it } from 'vitest';
import { CLIMATE_SIGNATURE_DIM, type MonthlyAggregate } from '@/features/climate-twin/types';
import {
  generateMonthlyHistory,
  heuristicMonthlyAggregate,
} from '@/shared/lib/ingest/climate/__tests__/synthetic-fixtures';
import {
  aggregateByYear,
  aggregateSignatures,
  buildSignatureForYear,
  cosineSimilarity,
} from '../twin-engine';

const ZONE_A = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const ZONE_B = '11111111-2222-3333-4444-555555555555';

describe('heuristicMonthlyAggregate', () => {
  it('determinístico (misma zone+mes → mismo aggregate)', () => {
    const a = heuristicMonthlyAggregate(ZONE_A, '2024-07-01');
    const b = heuristicMonthlyAggregate(ZONE_A, '2024-07-01');
    expect(a).toEqual(b);
  });

  it('julio tiene más lluvia que febrero en CDMX', () => {
    const jul = heuristicMonthlyAggregate(ZONE_A, '2024-07-01');
    const feb = heuristicMonthlyAggregate(ZONE_A, '2024-02-01');
    expect(jul.rainfall_mm ?? 0).toBeGreaterThan(feb.rainfall_mm ?? 0);
  });

  it('varía entre zonas (distintas seeds producen distintos outputs)', () => {
    const a = heuristicMonthlyAggregate(ZONE_A, '2024-07-01');
    const b = heuristicMonthlyAggregate(ZONE_B, '2024-07-01');
    expect(a.temp_avg).not.toBe(b.temp_avg);
  });
});

describe('generateMonthlyHistory', () => {
  it('produce ~180 meses para 15y', () => {
    const rows = generateMonthlyHistory(ZONE_A, 15);
    expect(rows.length).toBeGreaterThan(120);
    expect(rows.length).toBeLessThanOrEqual(200);
  });

  it('todas las filas son del mismo zone_id', () => {
    const rows = generateMonthlyHistory(ZONE_A, 2);
    expect(rows.every((r) => r.zone_id === ZONE_A)).toBe(true);
  });
});

describe('buildSignatureForYear', () => {
  it('retorna vector de 12 dimensiones', () => {
    const rows: MonthlyAggregate[] = [];
    for (let m = 1; m <= 12; m++) {
      rows.push(heuristicMonthlyAggregate(ZONE_A, `2024-${String(m).padStart(2, '0')}-01`));
    }
    const sig = buildSignatureForYear(rows);
    expect(sig).toHaveLength(CLIMATE_SIGNATURE_DIM);
  });

  it('todas las features quedan en rango 0..1', () => {
    const rows: MonthlyAggregate[] = [];
    for (let m = 1; m <= 12; m++) {
      rows.push(heuristicMonthlyAggregate(ZONE_A, `2024-${String(m).padStart(2, '0')}-01`));
    }
    const sig = buildSignatureForYear(rows);
    for (const f of sig) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

describe('cosineSimilarity', () => {
  it('retorna 1 para vectores idénticos', () => {
    const v = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('retorna 0 cuando uno de los vectores es todo ceros', () => {
    const v = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const z = new Array(12).fill(0);
    expect(cosineSimilarity(v, z)).toBe(0);
  });

  it('simetría: cos(a,b) === cos(b,a)', () => {
    const a = [0.1, 0.9, 0.5, 0.2, 0.8, 0.4, 0.3, 0.7, 0.6, 0.1, 0.4, 0.5];
    const b = [0.2, 0.8, 0.6, 0.3, 0.7, 0.5, 0.4, 0.6, 0.5, 0.2, 0.3, 0.4];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 8);
  });
});

describe('aggregateSignatures', () => {
  it('maneja input vacío', () => {
    const out = aggregateSignatures(new Map());
    expect(out).toHaveLength(CLIMATE_SIGNATURE_DIM);
    expect(out.every((x) => x === 0)).toBe(true);
  });

  it('calcula media over years con climate_change_delta en feature 11', () => {
    const year2011 = new Array(12).fill(0.3);
    const year2025 = new Array(12).fill(0.7);
    const map = new Map<number, readonly number[]>();
    map.set(2011, year2011);
    map.set(2012, year2011);
    map.set(2013, year2011);
    map.set(2023, year2025);
    map.set(2024, year2025);
    map.set(2025, year2025);
    const sig = aggregateSignatures(map);
    // delta en feature 11 debería ser > 0.5 (aumento temp_avg de 0.3 → 0.7 = +0.4, *5 + 0.5 = 2.5 → clamp 1).
    expect(sig[11]).toBeGreaterThan(0.5);
  });
});

describe('aggregateByYear', () => {
  it('agrupa correctamente por año', () => {
    const rows: MonthlyAggregate[] = [
      heuristicMonthlyAggregate(ZONE_A, '2023-01-01'),
      heuristicMonthlyAggregate(ZONE_A, '2023-07-01'),
      heuristicMonthlyAggregate(ZONE_A, '2024-03-01'),
    ];
    const map = aggregateByYear(rows);
    expect(map.get(2023)?.length).toBe(2);
    expect(map.get(2024)?.length).toBe(1);
  });
});
