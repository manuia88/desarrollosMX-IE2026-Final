'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  INDEX_CODES,
  type IndexCode,
} from '@/features/indices-publicos/lib/index-registry-helpers';

// Deterministic pseudo-random color band per (index, cell) so the SVG looks
// like real data without an RNG. Output is one of 4 score bands.
type Band = 'low' | 'mid' | 'high' | 'top';

const BAND_COLOR: Readonly<Record<Band, string>> = {
  low: 'var(--color-data-low, #fde68a)',
  mid: 'var(--color-data-mid, #fbbf24)',
  high: 'var(--color-data-high, #84cc16)',
  top: 'var(--color-data-top, #16a34a)',
};

const GRID_COLS = 8;
const GRID_ROWS = 5;

interface Cell {
  readonly id: string;
  readonly row: number;
  readonly col: number;
}

const CELLS: readonly Cell[] = Array.from({ length: GRID_ROWS }).flatMap((_, row) =>
  Array.from({ length: GRID_COLS }).map<Cell>((__, col) => ({
    id: `r${row}c${col}`,
    row,
    col,
  })),
);

function bandForCell(indexCode: IndexCode, row: number, col: number): Band {
  // Hash code by char codes + row/col for deterministic variation per index.
  const seed =
    indexCode.charCodeAt(0) * 31 + indexCode.charCodeAt(1) * 17 + indexCode.charCodeAt(2);
  const value = (seed + row * 13 + col * 7) % 100;
  if (value < 25) return 'low';
  if (value < 55) return 'mid';
  if (value < 80) return 'high';
  return 'top';
}

export interface HeatmapMockProps {
  readonly initialIndex?: IndexCode;
}

export function HeatmapMock({ initialIndex = 'IPV' }: HeatmapMockProps) {
  const t = useTranslations('PreviewDeveloper.flow.map');
  const tIndices = useTranslations('IndicesPublic');
  const [active, setActive] = useState<IndexCode>(initialIndex);

  const cellW = 40;
  const cellH = 32;
  const gap = 4;
  const width = GRID_COLS * (cellW + gap) - gap;
  const height = GRID_ROWS * (cellH + gap) - gap;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}>
      <div
        role="tablist"
        aria-label={t('active_index')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2, 0.5rem)',
        }}
      >
        {INDEX_CODES.map((code) => {
          const isActive = code === active;
          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(code)}
              style={{
                padding: 'var(--space-2, 0.5rem) var(--space-3, 0.75rem)',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: `1px solid ${isActive ? 'var(--color-accent-border)' : 'var(--color-border-subtle)'}`,
                background: isActive ? 'var(--color-accent-soft)' : 'var(--color-surface-elevated)',
                color: isActive ? 'var(--color-accent-strong)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-xs, 0.75rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                cursor: 'pointer',
              }}
            >
              {code}
            </button>
          );
        })}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span
          style={{
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('active_index')}
        </span>
        {': '}
        <span>{tIndices(`indices.${active}.name`)}</span>
      </p>

      <div
        style={{
          padding: 'var(--space-4, 1rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface-elevated)',
          overflowX: 'auto',
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-label={t('title')}
          role="img"
        >
          <title>{t('title')}</title>
          {CELLS.map((cell) => {
            const band = bandForCell(active, cell.row, cell.col);
            return (
              <rect
                key={cell.id}
                x={cell.col * (cellW + gap)}
                y={cell.row * (cellH + gap)}
                width={cellW}
                height={cellH}
                rx={4}
                fill={BAND_COLOR[band]}
                opacity={0.9}
              />
            );
          })}
        </svg>
      </div>

      <ul
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3, 0.75rem)',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          fontSize: 'var(--text-xs, 0.75rem)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {(['low', 'mid', 'high', 'top'] as const).map((b) => (
          <li
            key={b}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2, 0.5rem)' }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: BAND_COLOR[b],
                display: 'inline-block',
              }}
            />
            {t(`legend.${b}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
