import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export type ScoreTier = 'excellent' | 'good' | 'warning' | 'critical' | 'neutral';

export interface ScorePillProps extends HTMLAttributes<HTMLSpanElement> {
  tier?: ScoreTier;
  icon?: ReactNode;
}

const TIER_STYLES: Record<ScoreTier, CSSProperties> = {
  neutral: {
    background: 'rgba(99, 102, 241, 0.10)',
    borderColor: 'rgba(99, 102, 241, 0.24)',
    color: 'var(--canon-indigo-3)',
  },
  excellent: {
    background: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.30)',
    color: '#86efac',
  },
  good: {
    background: 'rgba(99, 102, 241, 0.10)',
    borderColor: 'rgba(99, 102, 241, 0.30)',
    color: 'var(--canon-indigo-2)',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.30)',
    color: '#fcd34d',
  },
  critical: {
    background: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.30)',
    color: '#fca5a5',
  },
};

export function tierFromScore(score: number): ScoreTier {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

export const ScorePill = forwardRef<HTMLSpanElement, ScorePillProps>(function ScorePill(
  { tier = 'neutral', icon, className, style, children, ...rest },
  ref,
) {
  const computedStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '12px',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    ...TIER_STYLES[tier],
    ...style,
  };
  return (
    <span
      ref={ref}
      className={cn('canon-score-pill', className)}
      data-tier={tier}
      style={computedStyle}
      {...rest}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
});
