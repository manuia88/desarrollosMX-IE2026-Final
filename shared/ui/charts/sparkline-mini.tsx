'use client';

import { type CSSProperties, useId, useRef } from 'react';
import { useInView } from '@/shared/ui/motion/use-in-view';

export interface SparklineMiniProps {
  data: ReadonlyArray<number>;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  durationMs?: number;
  className?: string;
  ariaLabel?: string;
}

function buildPath(data: ReadonlyArray<number>, width: number, height: number): string {
  if (data.length === 0) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  return data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function SparklineMini({
  data,
  width = 100,
  height = 24,
  stroke = '#6366f1',
  fill,
  strokeWidth = 1.5,
  durationMs = 1200,
  className = '',
  ariaLabel,
}: SparklineMiniProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const id = useId();
  const pathD = buildPath(data, width, height);

  const svgStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height,
    overflow: 'visible',
  };

  const pathStyle: CSSProperties = {
    strokeDasharray: 1000,
    strokeDashoffset: inView ? 0 : 1000,
    transition: `stroke-dashoffset ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : 'true'}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={svgStyle}
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={`sparkline-fill-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#sparkline-fill-${id})`}
            stroke="none"
            opacity={inView ? 1 : 0}
            style={{ transition: `opacity ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)` }}
          />
        </>
      ) : null}
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={pathStyle}
      />
    </svg>
  );
}
