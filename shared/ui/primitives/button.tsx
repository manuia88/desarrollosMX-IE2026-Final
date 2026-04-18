'use client';

import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'shimmer';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
}

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)] disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:brightness-105 active:brightness-95',
  secondary:
    'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-muted)] active:bg-[var(--color-bg-surface)]',
  tertiary:
    'bg-[var(--color-state-selected-bg)] text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/20 active:bg-[var(--color-brand-primary)]/25',
  ghost:
    'text-[var(--color-text-primary)] hover:bg-[var(--color-state-hover-overlay)] active:bg-[var(--color-state-active-overlay)]',
  danger:
    'bg-[var(--color-danger)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] hover:brightness-105 active:brightness-95',
  success:
    'bg-[var(--color-success)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)] hover:brightness-105 active:brightness-95',
  shimmer:
    'bg-[var(--gradient-p)] text-[var(--color-text-inverse)] shadow-[var(--shadow-md)] overflow-hidden hover:shadow-[var(--shadow-glow-primary)]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
};

const Spinner = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4 animate-[spin_1s_linear_infinite]"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    isLoading = false,
    isDisabled = false,
    fullWidth = false,
    asChild = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const resolvedDisabled = isDisabled || disabled || isLoading;

  return (
    <Comp
      ref={ref}
      aria-busy={isLoading || undefined}
      aria-disabled={resolvedDisabled || undefined}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        variant === 'shimmer' &&
          'before:absolute before:inset-0 before:-translate-x-full before:bg-[var(--gradient-shimmer)] before:animate-[shimmer_3s_ease-in-out_infinite]',
        className,
      )}
      disabled={resolvedDisabled}
      {...props}
    >
      {isLoading ? <Spinner /> : leftIcon}
      <span className={variant === 'shimmer' ? 'relative z-10' : undefined}>{children}</span>
      {!isLoading && rightIcon}
    </Comp>
  );
});
