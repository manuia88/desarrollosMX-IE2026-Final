import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export type DisclosureTone = 'violet' | 'indigo' | 'amber' | 'rose';

export interface DisclosurePillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: DisclosureTone;
  icon?: ReactNode;
}

const TONE_STYLES: Record<DisclosureTone, CSSProperties> = {
  violet: {
    background: 'rgba(168, 85, 247, 0.10)',
    borderColor: 'rgba(168, 85, 247, 0.32)',
    color: '#d8b4fe',
  },
  indigo: {
    background: 'rgba(99, 102, 241, 0.10)',
    borderColor: 'rgba(99, 102, 241, 0.32)',
    color: 'var(--canon-indigo-3)',
  },
  amber: {
    background: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.32)',
    color: '#fcd34d',
  },
  rose: {
    background: 'rgba(236, 72, 153, 0.10)',
    borderColor: 'rgba(236, 72, 153, 0.32)',
    color: '#f9a8d4',
  },
};

export const DisclosurePill = forwardRef<HTMLSpanElement, DisclosurePillProps>(
  function DisclosurePill({ tone = 'violet', icon, className, style, children, ...rest }, ref) {
    const computedStyle: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      borderRadius: 'var(--canon-radius-pill)',
      border: '1px solid',
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: '11px',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      ...TONE_STYLES[tone],
      ...style,
    };
    return (
      <span
        ref={ref}
        className={cn('canon-disclosure-pill', className)}
        data-tone={tone}
        style={computedStyle}
        {...rest}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        {children}
      </span>
    );
  },
);
