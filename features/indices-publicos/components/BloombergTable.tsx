'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '@/shared/ui/primitives/cn';

export type SortDirection = 'asc' | 'desc';

export interface BloombergColumn<TRow> {
  readonly key: string;
  readonly label: string;
  readonly align?: 'left' | 'right';
  readonly accessor: (row: TRow) => string | number | null | undefined;
  readonly render?: (row: TRow) => React.ReactNode;
  readonly sortable?: boolean;
}

export interface BloombergTableProps<TRow> {
  readonly rows: ReadonlyArray<TRow>;
  readonly columns: ReadonlyArray<BloombergColumn<TRow>>;
  readonly rowKey: (row: TRow) => string;
  readonly searchPlaceholder?: string;
  readonly noResultsLabel?: string;
  readonly caption?: string;
  readonly className?: string;
}

// ---- Pure helpers (exportados para tests) ----

export function sortRowsBy<TRow>(
  rows: ReadonlyArray<TRow>,
  column: BloombergColumn<TRow>,
  direction: SortDirection,
): ReadonlyArray<TRow> {
  const indexed = rows.map((row, index) => ({ row, index, value: column.accessor(row) }));
  indexed.sort((a, b) => {
    const av = a.value;
    const bv = b.value;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return direction === 'asc' ? av - bv : bv - av;
    }
    const as = String(av);
    const bs = String(bv);
    return direction === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
  return indexed.map((entry) => entry.row);
}

export function filterRowsBySearch<TRow>(
  rows: ReadonlyArray<TRow>,
  columns: ReadonlyArray<BloombergColumn<TRow>>,
  query: string,
): ReadonlyArray<TRow> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return rows;
  return rows.filter((row) =>
    columns.some((col) => {
      const raw = col.accessor(row);
      if (raw === null || raw === undefined) return false;
      return String(raw).toLowerCase().includes(normalized);
    }),
  );
}

export function toggleSortDirection(
  current: { key: string; direction: SortDirection } | null,
  nextKey: string,
): { key: string; direction: SortDirection } {
  if (current && current.key === nextKey) {
    return { key: nextKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key: nextKey, direction: 'asc' };
}

// ---- Component ----

export function BloombergTable<TRow>({
  rows,
  columns,
  rowKey,
  searchPlaceholder,
  noResultsLabel,
  caption,
  className,
}: BloombergTableProps<TRow>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const activeSortColumn = useMemo(
    () => (sort ? (columns.find((c) => c.key === sort.key) ?? null) : null),
    [columns, sort],
  );

  const processed = useMemo(() => {
    const filtered = filterRowsBySearch(rows, columns, query);
    if (!sort || !activeSortColumn) return filtered;
    return sortRowsBy(filtered, activeSortColumn, sort.direction);
  }, [activeSortColumn, columns, query, rows, sort]);

  const handleSortClick = useCallback((key: string) => {
    setSort((prev) => toggleSortDirection(prev, key));
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTableElement>) => {
    if (!tableRef.current) return;
    const focusable = Array.from(
      tableRef.current.querySelectorAll<HTMLElement>('tbody [tabindex="0"]'),
    );
    const active = document.activeElement as HTMLElement | null;
    const currentIndex = active ? focusable.indexOf(active) : -1;
    if (event.key === 'ArrowDown' && currentIndex < focusable.length - 1) {
      event.preventDefault();
      focusable[currentIndex + 1]?.focus();
    } else if (event.key === 'ArrowUp' && currentIndex > 0) {
      event.preventDefault();
      focusable[currentIndex - 1]?.focus();
    }
  }, []);

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {searchPlaceholder ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--color-border-subtle)',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text-primary)',
          }}
        />
      ) : null}
      <div
        className="overflow-x-auto rounded-[var(--radius-md)] border"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <table
          ref={tableRef}
          onKeyDown={handleKeyDown}
          className="min-w-full text-xs"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-primary)',
            borderCollapse: 'collapse',
          }}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="sticky top-0" style={{ background: 'var(--color-surface-raised)' }}>
            <tr>
              {columns.map((col) => {
                const isActive = sort?.key === col.key;
                const ariaSort: 'ascending' | 'descending' | 'none' = isActive
                  ? sort?.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      'px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b',
                      col.align === 'right' ? 'text-right' : 'text-left',
                    )}
                    style={{
                      borderColor: 'var(--color-border-subtle)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {col.sortable === false ? (
                      col.label
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSortClick(col.key)}
                        className="inline-flex items-center gap-1 hover:opacity-80"
                        aria-label={col.label}
                      >
                        <span>{col.label}</span>
                        <span aria-hidden="true">
                          {isActive ? (sort?.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {noResultsLabel ?? '—'}
                </td>
              </tr>
            ) : (
              processed.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b hover:bg-[var(--color-bg-muted)]"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-1.5 whitespace-nowrap outline-none focus-visible:ring-2',
                        col.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                      )}
                    >
                      {col.render ? col.render(row) : (col.accessor(row) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
