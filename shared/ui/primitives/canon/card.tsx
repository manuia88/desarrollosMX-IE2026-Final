import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export type CardCanonVariant = 'default' | 'elevated' | 'recessed' | 'spotlight';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardCanonVariant;
  hoverable?: boolean;
}

const VARIANT_STYLES: Record<CardCanonVariant, CSSProperties> = {
  default: {
    background: 'var(--canon-bg-2)',
    border: '1px solid var(--canon-border)',
  },
  elevated: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-border-2)',
  },
  recessed: {
    background: 'var(--surface-recessed)',
    border: '1px solid var(--canon-border)',
  },
  spotlight: {
    background: 'var(--surface-spotlight)',
    border: '1px solid var(--canon-border-2)',
  },
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', hoverable = false, className, style, ...rest },
  ref,
) {
  const computedStyle: CSSProperties = {
    borderRadius: 'var(--canon-radius-card)',
    boxShadow: 'var(--shadow-canon-rest)',
    transition: `transform var(--canon-duration-normal) var(--canon-ease-out), border-color var(--canon-duration-fast) ease, box-shadow var(--canon-duration-normal) var(--canon-ease-out)`,
    color: 'var(--canon-cream)',
    ...VARIANT_STYLES[variant],
    ...style,
  };
  return (
    <div
      ref={ref}
      className={cn('canon-card', hoverable ? 'canon-card-hoverable' : '', className)}
      data-canon-variant={variant}
      style={computedStyle}
      {...rest}
    />
  );
});
