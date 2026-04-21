'use client';

// Pure-SVG line chart — no chart library required.
// TODO upgrade to recharts cuando esté en package.json.
//
// Renderiza hasta 4 series (scopes) en un mismo SVG, con ejes y tooltip básico
// on-hover. Soporta reduced-motion (no transiciones) y acepta handlers de
// zoom opcionales vía props para que el page container controle el rango
// from/to.

import { useCallback, useMemo, useState } from 'react';
import type { BacktestScopeResult } from '../lib/backtest-simulator';

export interface BacktestChartProps {
  readonly results: ReadonlyArray<BacktestScopeResult>;
  readonly height?: number;
  readonly width?: number;
  readonly ariaLabel?: string;
}

const PALETTE = [
  'oklch(0.67 0.19 285)', // primary
  'oklch(0.78 0.17 50)', // sunset
  'oklch(0.78 0.12 180)', // cool
  'oklch(0.85 0.12 145)', // fresh
] as const;

interface NormalizedPoint {
  readonly x: number;
  readonly y: number;
  readonly date: string;
  readonly value: number;
}

function buildDateAxis(results: ReadonlyArray<BacktestScopeResult>): ReadonlyArray<string> {
  const dates = new Set<string>();
  for (const scope of results) {
    for (const point of scope.points) {
      dates.add(point.period_date);
    }
  }
  return Array.from(dates).sort();
}

function getValueBounds(results: ReadonlyArray<BacktestScopeResult>): {
  readonly min: number;
  readonly max: number;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const scope of results) {
    for (const point of scope.points) {
      if (point.indexed_value < min) min = point.indexed_value;
      if (point.indexed_value > max) max = point.indexed_value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 100 };
  }
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

export function BacktestChart({
  results,
  height = 320,
  width = 720,
  ariaLabel,
}: BacktestChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const innerW = Math.max(0, width - padding.left - padding.right);
  const innerH = Math.max(0, height - padding.top - padding.bottom);

  const xAxis = useMemo(() => buildDateAxis(results), [results]);
  const { min, max } = useMemo(() => getValueBounds(results), [results]);

  const xStep = xAxis.length <= 1 ? 0 : innerW / (xAxis.length - 1);

  const computeY = useCallback(
    (value: number): number => {
      if (max === min) return innerH / 2;
      return innerH - ((value - min) / (max - min)) * innerH;
    },
    [max, min, innerH],
  );

  const series = useMemo(() => {
    return results.map((scope, idx) => {
      const points: NormalizedPoint[] = [];
      for (const point of scope.points) {
        const xIndex = xAxis.indexOf(point.period_date);
        if (xIndex === -1) continue;
        points.push({
          x: xIndex * xStep,
          y: computeY(point.indexed_value),
          date: point.period_date,
          value: point.indexed_value,
        });
      }
      const color = PALETTE[idx % PALETTE.length];
      return { scope_id: scope.scope_id, points, color };
    });
  }, [results, xAxis, xStep, computeY]);

  if (results.length === 0 || xAxis.length === 0) {
    return (
      <div
        role="img"
        aria-label={ariaLabel ?? 'backtest chart empty'}
        className="flex items-center justify-center rounded-[var(--radius-md)] border text-xs"
        style={{
          width,
          height,
          borderColor: 'var(--color-border-subtle)',
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-sunken)',
        }}
      >
        —
      </div>
    );
  }

  const yTicks = 4;
  const yTickValues = Array.from(
    { length: yTicks + 1 },
    (_, i) => min + ((max - min) / yTicks) * i,
  );
  const xTickStride = Math.max(1, Math.floor(xAxis.length / 6));

  const hoverDate = hoverIdx !== null ? xAxis[hoverIdx] : null;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={ariaLabel ?? 'backtest chart'}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ background: 'var(--color-surface-base)' }}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const scale = width / rect.width;
          const localX = (event.clientX - rect.left) * scale - padding.left;
          if (xStep <= 0) return;
          const idx = Math.max(0, Math.min(xAxis.length - 1, Math.round(localX / xStep)));
          setHoverIdx(idx);
        }}
      >
        <title>{ariaLabel ?? 'backtest chart'}</title>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {yTickValues.map((tick) => {
            const y = computeY(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border-subtle)"
                  strokeDasharray="2 4"
                />
                <text
                  x={-6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="var(--color-text-muted)"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}
          {xAxis.map((date, idx) => {
            if (idx % xTickStride !== 0 && idx !== xAxis.length - 1) return null;
            const x = idx * xStep;
            return (
              <text
                key={`x-${date}`}
                x={x}
                y={innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-text-muted)"
              >
                {date.slice(0, 7)}
              </text>
            );
          })}
          {series.map((s) => {
            if (s.points.length === 0) return null;
            const d = s.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
              .join(' ');
            return (
              <g key={s.scope_id}>
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {hoverIdx !== null
                  ? (() => {
                      const hp = s.points.find((p) => p.date === xAxis[hoverIdx]);
                      if (!hp) return null;
                      return (
                        <circle
                          cx={hp.x}
                          cy={hp.y}
                          r={3.5}
                          fill={s.color}
                          stroke="var(--color-surface-base)"
                          strokeWidth={1.5}
                        />
                      );
                    })()
                  : null}
              </g>
            );
          })}
          {hoverIdx !== null ? (
            <line
              x1={hoverIdx * xStep}
              x2={hoverIdx * xStep}
              y1={0}
              y2={innerH}
              stroke="var(--color-border-strong)"
              strokeDasharray="2 2"
            />
          ) : null}
        </g>
      </svg>
      {hoverDate ? (
        <div
          role="status"
          className="flex flex-wrap gap-3 text-xs"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>{hoverDate}</span>
          {series.map((s) => {
            const hp = s.points.find((p) => p.date === hoverDate);
            if (!hp) return null;
            return (
              <span key={s.scope_id} style={{ color: s.color }}>
                {s.scope_id}: {hp.value.toFixed(2)}
              </span>
            );
          })}
        </div>
      ) : null}
    </figure>
  );
}
