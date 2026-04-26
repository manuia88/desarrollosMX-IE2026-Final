import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export type DecisionCrystalSize = 'sm' | 'md' | 'lg';

export interface DecisionCrystalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  metrics: readonly [number, number, number];
  labels?: readonly [string, string, string];
  size?: DecisionCrystalSize;
  reduceMotion?: boolean;
}

const SIZE: Record<
  DecisionCrystalSize,
  { width: number; height: number; bar: number; gap: number }
> = {
  sm: { width: 40, height: 32, bar: 10, gap: 3 },
  md: { width: 64, height: 52, bar: 16, gap: 4 },
  lg: { width: 96, height: 80, bar: 24, gap: 6 },
};

export const DecisionCrystal = forwardRef<HTMLDivElement, DecisionCrystalProps>(
  function DecisionCrystal(
    {
      metrics,
      labels = ['A', 'B', 'C'],
      size = 'md',
      reduceMotion = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const dim = SIZE[size];
    const max = Math.max(metrics[0], metrics[1], metrics[2], 1);
    const ariaLabel = `${labels[0]} ${metrics[0]}, ${labels[1]} ${metrics[1]}, ${labels[2]} ${metrics[2]}`;

    const containerStyle: CSSProperties = {
      width: dim.width,
      height: dim.height,
      display: 'flex',
      alignItems: 'flex-end',
      gap: dim.gap,
      ...style,
    };

    return (
      <div
        ref={ref}
        role="img"
        aria-label={ariaLabel}
        data-canon-variant="decision-crystal"
        data-size={size}
        className={cn('canon-decision-crystal', className)}
        style={containerStyle}
        {...rest}
      >
        {metrics.map((value, i) => {
          const heightPct = (value / max) * 100;
          const labelText = labels[i] ?? '';
          const barStyle: CSSProperties = {
            width: dim.bar,
            height: `${heightPct}%`,
            background: 'linear-gradient(180deg, var(--canon-indigo), var(--canon-rose))',
            borderRadius: 'var(--canon-radius-sharp)',
            transformOrigin: 'bottom',
            ...(reduceMotion
              ? {}
              : {
                  animation: `bar-grow 600ms var(--canon-ease-out) ${i * 80}ms backwards`,
                }),
          };
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: 3 fixed metrics, order is stable
            <div key={i} title={`${labelText}: ${value}`} aria-hidden="true" style={barStyle} />
          );
        })}
      </div>
    );
  },
);
