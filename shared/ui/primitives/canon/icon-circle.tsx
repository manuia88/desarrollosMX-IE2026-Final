import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export type IconCircleSize = 'sm' | 'md' | 'lg';

export interface IconCircleProps extends HTMLAttributes<HTMLSpanElement> {
  size?: IconCircleSize;
  tone?: 'glass' | 'indigo' | 'rose' | 'teal' | 'violet' | 'gold';
  icon: ReactNode;
}

const SIZE_DIMENSIONS: Record<IconCircleSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

const TONE_STYLES: Record<NonNullable<IconCircleProps['tone']>, CSSProperties> = {
  glass: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    color: 'var(--canon-cream)',
  },
  indigo: {
    background: 'rgba(99, 102, 241, 0.12)',
    border: '1px solid rgba(99, 102, 241, 0.30)',
    color: 'var(--canon-indigo-2)',
  },
  rose: {
    background: 'rgba(236, 72, 153, 0.12)',
    border: '1px solid rgba(236, 72, 153, 0.30)',
    color: '#f9a8d4',
  },
  teal: {
    background: 'var(--accent-teal-soft)',
    border: '1px solid rgba(20, 184, 166, 0.30)',
    color: 'var(--accent-teal)',
  },
  violet: {
    background: 'var(--accent-violet-soft)',
    border: '1px solid rgba(168, 85, 247, 0.30)',
    color: 'var(--accent-violet)',
  },
  gold: {
    background: 'var(--accent-gold-soft)',
    border: '1px solid rgba(234, 179, 8, 0.30)',
    color: 'var(--accent-gold)',
  },
};

export const IconCircle = forwardRef<HTMLSpanElement, IconCircleProps>(function IconCircle(
  { size = 'md', tone = 'glass', icon, className, style, ...rest },
  ref,
) {
  const dim = SIZE_DIMENSIONS[size];
  const computedStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${dim}px`,
    height: `${dim}px`,
    borderRadius: 'var(--canon-radius-pill)',
    flexShrink: 0,
    ...TONE_STYLES[tone],
    ...style,
  };
  return (
    <span
      ref={ref}
      className={cn('canon-icon-circle', className)}
      data-canon-tone={tone}
      style={computedStyle}
      {...rest}
    >
      {icon}
    </span>
  );
});
