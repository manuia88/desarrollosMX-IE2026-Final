import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export interface HeatmapDensityProps extends HTMLAttributes<HTMLDivElement> {
  values: readonly number[];
  rows?: number;
  cols?: number;
  max?: number;
  baseColor?: string;
  ariaLabel: string;
  cellLabels?: readonly string[];
}

export const HeatmapDensity = forwardRef<HTMLDivElement, HeatmapDensityProps>(
  function HeatmapDensity(
    {
      values,
      rows = 5,
      cols = 6,
      max,
      baseColor = 'var(--mod-dashboard)',
      ariaLabel,
      cellLabels,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const computedMax = max ?? (values.length > 0 ? Math.max(...values) : 0);
    const total = rows * cols;

    const containerStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 3,
      ...style,
    };

    return (
      <div
        ref={ref}
        role="img"
        aria-label={ariaLabel}
        data-canon-variant="heatmap-density"
        className={cn('canon-heatmap-density', className)}
        style={containerStyle}
        {...rest}
      >
        {Array.from({ length: total }, (_, i) => {
          const value = values[i] ?? 0;
          const opacity = computedMax > 0 ? Math.min(value / computedMax, 1) : 0;
          const cellOpacity = 0.08 + opacity * 0.82;
          const delay = `${Math.min(i * 18, 540)}ms`;
          const cellStyle: CSSProperties = {
            aspectRatio: '1 / 1',
            background: baseColor,
            opacity: cellOpacity,
            borderRadius: 'var(--canon-radius-sharp)',
            animation: `heatmap-fade 300ms var(--canon-ease-out) ${delay} backwards`,
          };
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: positional grid, cells map 1:1 to values index
              key={i}
              title={cellLabels?.[i] ?? String(value)}
              aria-hidden="true"
              style={cellStyle}
            />
          );
        })}
      </div>
    );
  },
);
