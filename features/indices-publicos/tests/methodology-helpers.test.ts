import { describe, expect, it } from 'vitest';
import {
  groupByIndexCode,
  isActiveMethodology,
  type MethodologyRow,
  normalizeWeightsToPercent,
  parseWeightsJsonb,
  resolveActiveMethodology,
} from '../lib/methodology-helpers';

function row(
  partial: Partial<MethodologyRow> & Pick<MethodologyRow, 'index_code' | 'version'>,
): MethodologyRow {
  return {
    formula_md: 'sum(w_i * x_i)',
    weights_jsonb: {},
    effective_from: '2026-01-01',
    effective_to: null,
    changelog_notes: null,
    approved_at: null,
    ...partial,
  };
}

describe('parseWeightsJsonb', () => {
  it('parsea objeto plano { key: number }', () => {
    const result = parseWeightsJsonb({ price: 0.5, amenities: 0.3, transit: 0.2 });
    expect(result).toEqual([
      { key: 'price', weight: 0.5 },
      { key: 'amenities', weight: 0.3 },
      { key: 'transit', weight: 0.2 },
    ]);
  });

  it('parsea array [{ key, weight }]', () => {
    const result = parseWeightsJsonb([
      { key: 'a', weight: 0.7 },
      { key: 'b', weight: 0.3 },
    ]);
    expect(result).toEqual([
      { key: 'a', weight: 0.7 },
      { key: 'b', weight: 0.3 },
    ]);
  });

  it('parsea array [{ name, value }] (alias)', () => {
    const result = parseWeightsJsonb([
      { name: 'x', value: 0.4 },
      { name: 'y', value: 0.6 },
    ]);
    expect(result).toEqual([
      { key: 'y', weight: 0.6 },
      { key: 'x', weight: 0.4 },
    ]);
  });

  it('desanida { components: {...} }', () => {
    const result = parseWeightsJsonb({ components: { a: 1, b: 2 } });
    expect(result.map((e) => e.key)).toEqual(['b', 'a']);
  });

  it('desanida { weights: {...} }', () => {
    const result = parseWeightsJsonb({ weights: { x: 0.5, y: 0.5 } });
    expect(result.length).toBe(2);
  });

  it('acepta strings numéricos ("0.4")', () => {
    const result = parseWeightsJsonb({ a: '0.4', b: '0.6' });
    expect(result.map((e) => e.weight)).toEqual([0.6, 0.4]);
  });

  it('ignora valores no-numéricos y negativos', () => {
    const result = parseWeightsJsonb({
      good: 0.5,
      bad: -0.3,
      nope: 'abc',
      nada: null,
    });
    expect(result).toEqual([{ key: 'good', weight: 0.5 }]);
  });

  it('devuelve [] para null/undefined/non-object', () => {
    expect(parseWeightsJsonb(null)).toEqual([]);
    expect(parseWeightsJsonb(undefined)).toEqual([]);
    expect(parseWeightsJsonb(42)).toEqual([]);
    expect(parseWeightsJsonb('str')).toEqual([]);
  });

  it('ordena descendente por peso, estable por key para empates', () => {
    const result = parseWeightsJsonb({ c: 0.3, a: 0.5, b: 0.5 });
    expect(result.map((e) => e.key)).toEqual(['a', 'b', 'c']);
  });
});

describe('resolveActiveMethodology', () => {
  const v1 = row({
    index_code: 'IPV',
    version: 'v1.0',
    effective_from: '2025-01-01',
    effective_to: '2025-12-31',
  });
  const v2 = row({
    index_code: 'IPV',
    version: 'v2.0',
    effective_from: '2026-01-01',
    effective_to: null,
  });

  it('devuelve la versión activa abierta para fecha actual', () => {
    expect(resolveActiveMethodology([v1, v2], '2026-04-01')).toBe(v2);
  });

  it('devuelve versión cerrada si today cae en su ventana', () => {
    expect(resolveActiveMethodology([v1, v2], '2025-06-01')).toBe(v1);
  });

  it('devuelve null si today es anterior a todas las versiones', () => {
    expect(resolveActiveMethodology([v1, v2], '2024-12-31')).toBeNull();
  });

  it('prefiere la versión con effective_from más reciente en traslape', () => {
    const overlap = row({
      index_code: 'IPV',
      version: 'v1.5',
      effective_from: '2025-06-01',
      effective_to: '2026-06-01',
    });
    const result = resolveActiveMethodology([v1, overlap, v2], '2026-03-01');
    expect(result).toBe(v2);
  });

  it('acepta array vacío → null', () => {
    expect(resolveActiveMethodology([], '2026-04-01')).toBeNull();
  });
});

describe('isActiveMethodology', () => {
  it('true cuando effective_to === null y from <= today', () => {
    const r = row({ index_code: 'IPV', version: 'v2', effective_from: '2026-01-01' });
    expect(isActiveMethodology(r, '2026-04-21')).toBe(true);
  });

  it('false cuando today < effective_from', () => {
    const r = row({ index_code: 'IPV', version: 'v2', effective_from: '2026-06-01' });
    expect(isActiveMethodology(r, '2026-04-21')).toBe(false);
  });

  it('false cuando today > effective_to', () => {
    const r = row({
      index_code: 'IPV',
      version: 'v1',
      effective_from: '2025-01-01',
      effective_to: '2025-12-31',
    });
    expect(isActiveMethodology(r, '2026-04-21')).toBe(false);
  });
});

describe('groupByIndexCode', () => {
  it('agrupa preservando orden', () => {
    const rows = [
      row({ index_code: 'IPV', version: 'v2', effective_from: '2026-01-01' }),
      row({ index_code: 'IPV', version: 'v1', effective_from: '2025-01-01' }),
      row({ index_code: 'IAB', version: 'v1', effective_from: '2025-01-01' }),
    ];
    const grouped = groupByIndexCode(rows);
    expect(grouped.size).toBe(2);
    expect(grouped.get('IPV')?.map((r) => r.version)).toEqual(['v2', 'v1']);
    expect(grouped.get('IAB')?.map((r) => r.version)).toEqual(['v1']);
  });
});

describe('normalizeWeightsToPercent', () => {
  it('normaliza fracciones 0-1 a porcentajes 0-100', () => {
    const result = normalizeWeightsToPercent([
      { key: 'a', weight: 0.25 },
      { key: 'b', weight: 0.75 },
    ]);
    expect(result).toEqual([
      { key: 'a', weight: 25 },
      { key: 'b', weight: 75 },
    ]);
  });

  it('normaliza pesos absolutos distintos', () => {
    const result = normalizeWeightsToPercent([
      { key: 'a', weight: 2 },
      { key: 'b', weight: 8 },
    ]);
    expect(result[0]?.weight).toBeCloseTo(20);
    expect(result[1]?.weight).toBeCloseTo(80);
  });

  it('devuelve 0 para todo si total = 0', () => {
    const result = normalizeWeightsToPercent([
      { key: 'a', weight: 0 },
      { key: 'b', weight: 0 },
    ]);
    expect(result).toEqual([
      { key: 'a', weight: 0 },
      { key: 'b', weight: 0 },
    ]);
  });
});
