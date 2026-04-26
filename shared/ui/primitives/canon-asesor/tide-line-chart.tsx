'use client';

import { type CSSProperties, forwardRef, type HTMLAttributes, useMemo } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export interface TideLineChartProps extends HTMLAttributes<HTMLDivElement> {
  current: readonly number[];
  p25: readonly number[];
  p75: readonly number[];
  width?: number;
  height?: number;
  ariaLabel: string;
  lineColor?: string;
}

function buildPaths(
  current: readonly number[],
  p25: readonly number[],
  p75: readonly number[],
  width: number,
  height: number,
): { line: string; area: string } {
  const n = Math.min(current.length, p25.length, p75.length);
  if (n < 2) return { line: '', area: '' };

  const allValues = [...current.slice(0, n), ...p25.slice(0, n), ...p75.slice(0, n)];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const stepX = width / (n - 1);

  const project = (i: number, v: number): [number, number] => [
    i * stepX,
    height - ((v - min) / range) * height,
  ];

  const linePoints = current
    .slice(0, n)
    .map((v, i) => {
      const [x, y] = project(i, v);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const upper = p75
    .slice(0, n)
    .map((v, i) => {
      const [x, y] = project(i, v);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const lower = p25
    .slice(0, n)
    .reverse()
    .map((v, i) => {
      const idx = n - 1 - i;
      const [x, y] = project(idx, v);
      return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return { line: linePoints, area: `${upper} ${lower} Z` };
}

export const TideLineChart = forwardRef<HTMLDivElement, TideLineChartProps>(function TideLineChart(
  {
    current,
    p25,
    p75,
    width = 160,
    height = 48,
    ariaLabel,
    lineColor = 'var(--canon-indigo)',
    className,
    style,
    ...rest
  },
  ref,
) {
  const paths = useMemo(
    () => buildPaths(current, p25, p75, width, height),
    [current, p25, p75, width, height],
  );

  const containerStyle: CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      ref={ref}
      data-canon-variant="tide-line-chart"
      className={cn('canon-tide-line-chart', className)}
      style={containerStyle}
      {...rest}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>
        {paths.area ? <path d={paths.area} fill={lineColor} fillOpacity={0.12} /> : null}
        {paths.line ? (
          <path
            d={paths.line}
            stroke={lineColor}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
    </div>
  );
});
