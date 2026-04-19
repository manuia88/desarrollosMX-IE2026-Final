import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'gradient'
  | 'stub';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
  info: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
  neutral: 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]',
  gradient: 'bg-[var(--gradient-p)] text-[var(--color-text-inverse)]',
  stub: 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border-subtle)] uppercase tracking-wide',
};

const sizes: Record<BadgeSize, string> = {
  xs: 'h-4 px-1.5 text-[10px]',
  sm: 'h-5 px-2 text-xs',
  md: 'h-6 px-2.5 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'neutral', size = 'sm', className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] font-[var(--font-weight-medium)] whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  onRemove?: () => void;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { icon, onRemove, className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 h-6 pl-2 pr-1.5 rounded-[var(--radius-pill)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] text-xs font-[var(--font-weight-medium)]',
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--color-state-hover-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M2 2L10 10M10 2L2 10" />
          </svg>
        </button>
      )}
    </span>
  );
});

export interface ChipProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, 'onChange' | 'onToggle'> {
  isSelected?: boolean;
  onToggle?: (next: boolean) => void;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { isSelected = false, onToggle, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isSelected}
      onClick={() => onToggle?.(!isSelected)}
      className={cn(
        'inline-flex items-center gap-1 h-8 px-3 rounded-[var(--radius-pill)] text-sm font-[var(--font-weight-medium)] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-1',
        isSelected
          ? 'bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] border-transparent shadow-[var(--shadow-xs)]'
          : 'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
