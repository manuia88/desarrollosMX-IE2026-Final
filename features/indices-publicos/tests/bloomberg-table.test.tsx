import { describe, expect, it } from 'vitest';
import {
  type BloombergColumn,
  BloombergTable,
  filterRowsBySearch,
  type SortDirection,
  sortRowsBy,
  toggleSortDirection,
} from '../components/BloombergTable';

interface Row {
  readonly scope_id: string;
  readonly value: number;
  readonly rank: number | null;
}

const ROWS: ReadonlyArray<Row> = [
  { scope_id: 'roma-norte', value: 88.2, rank: 1 },
  { scope_id: 'condesa', value: 76.4, rank: 2 },
  { scope_id: 'polanco', value: 91.1, rank: null },
];

const COLUMNS: ReadonlyArray<BloombergColumn<Row>> = [
  { key: 'scope', label: 'Scope', accessor: (r) => r.scope_id },
  { key: 'value', label: 'Value', accessor: (r) => r.value },
  { key: 'rank', label: 'Rank', accessor: (r) => r.rank },
];

describe('BloombergTable — module export smoke', () => {
  it('exporta componente y helpers', () => {
    expect(typeof BloombergTable).toBe('function');
    expect(typeof sortRowsBy).toBe('function');
    expect(typeof filterRowsBySearch).toBe('function');
    expect(typeof toggleSortDirection).toBe('function');
  });
});

describe('sortRowsBy', () => {
  it('ordena asc por valor numérico', () => {
    const valueCol = COLUMNS.find((c) => c.key === 'value');
    expect(valueCol).toBeDefined();
    if (!valueCol) return;
    const sorted = sortRowsBy(ROWS, valueCol, 'asc');
    expect(sorted.map((r) => r.scope_id)).toEqual(['condesa', 'roma-norte', 'polanco']);
  });

  it('ordena desc por valor numérico', () => {
    const valueCol = COLUMNS.find((c) => c.key === 'value');
    if (!valueCol) return;
    const sorted = sortRowsBy(ROWS, valueCol, 'desc');
    expect(sorted.map((r) => r.scope_id)).toEqual(['polanco', 'roma-norte', 'condesa']);
  });

  it('ordena asc por string alfabético', () => {
    const scopeCol = COLUMNS.find((c) => c.key === 'scope');
    if (!scopeCol) return;
    const sorted = sortRowsBy(ROWS, scopeCol, 'asc');
    expect(sorted.map((r) => r.scope_id)).toEqual(['condesa', 'polanco', 'roma-norte']);
  });

  it('posiciona valores null al final independientemente de la dirección', () => {
    const rankCol = COLUMNS.find((c) => c.key === 'rank');
    if (!rankCol) return;
    const asc = sortRowsBy(ROWS, rankCol, 'asc');
    expect(asc[asc.length - 1]?.scope_id).toBe('polanco');
  });
});

describe('filterRowsBySearch', () => {
  it('filtra por match case-insensitive en cualquier columna', () => {
    const filtered = filterRowsBySearch(ROWS, COLUMNS, 'ROMA');
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.scope_id).toBe('roma-norte');
  });

  it('devuelve todas las filas si el query es vacío o espacios', () => {
    expect(filterRowsBySearch(ROWS, COLUMNS, '')).toHaveLength(3);
    expect(filterRowsBySearch(ROWS, COLUMNS, '   ')).toHaveLength(3);
  });

  it('devuelve vacío si ningún match', () => {
    expect(filterRowsBySearch(ROWS, COLUMNS, 'zzz-unknown')).toHaveLength(0);
  });
});

describe('toggleSortDirection', () => {
  it('primera click sobre columna nueva → asc', () => {
    const next = toggleSortDirection(null, 'value');
    expect(next).toEqual({ key: 'value', direction: 'asc' as SortDirection });
  });

  it('click repetido sobre misma columna → flip asc↔desc', () => {
    const asc = toggleSortDirection({ key: 'value', direction: 'asc' }, 'value');
    expect(asc.direction).toBe('desc');
    const desc = toggleSortDirection({ key: 'value', direction: 'desc' }, 'value');
    expect(desc.direction).toBe('asc');
  });

  it('click sobre columna distinta → reset a asc', () => {
    const next = toggleSortDirection({ key: 'value', direction: 'desc' }, 'rank');
    expect(next).toEqual({ key: 'rank', direction: 'asc' as SortDirection });
  });
});
