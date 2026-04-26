import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export type MomentumDirection = 'positive' | 'neutral' | 'negative';

export interface MomentumPillProps extends HTMLAttributes<HTMLSpanElement> {
  direction?: MomentumDirection;
  icon?: ReactNode;
}

const DIRECTION_STYLES: Record<MomentumDirection, CSSProperties> = {
  positive: {
    background: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.30)',
    color: '#86efac',
  },
  neutral: {
    background: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.24)',
    color: 'var(--canon-indigo-3)',
  },
  negative: {
    background: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.32)',
    color: '#fca5a5',
  },
};

export function directionFromDelta(delta: number): MomentumDirection {
  if (delta > 0.5) return 'positive';
  if (delta < -0.5) return 'negative';
  return 'neutral';
}

export const MomentumPill = forwardRef<HTMLSpanElement, MomentumPillProps>(function MomentumPill(
  { direction = 'neutral', icon, className, style, children, ...rest },
  ref,
) {
  const computedStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '11.5px',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
    ...DIRECTION_STYLES[direction],
    ...style,
  };
  return (
    <span
      ref={ref}
      className={cn('canon-momentum-pill', className)}
      data-direction={direction}
      style={computedStyle}
      {...rest}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
});
