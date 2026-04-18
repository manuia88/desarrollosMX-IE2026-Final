'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';
import { cn } from './cn';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightAddon?: ReactNode;
  size?: InputSize;
}

const fieldBase =
  'w-full rounded-[var(--radius-md)] border bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

const sizes: Record<InputSize, string> = {
  sm: 'h-8 text-sm',
  md: 'h-10 text-base',
  lg: 'h-12 text-lg',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightAddon,
    size = 'md',
    id,
    className,
    'aria-describedby': ariaDescribedByProp,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const describedBy = error
    ? `${inputId}-error`
    : helperText
      ? `${inputId}-helper`
      : ariaDescribedByProp;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[var(--text-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-stretch">
        {leftIcon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-muted)]"
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            fieldBase,
            sizes[size],
            leftIcon && 'pl-10',
            rightAddon ? 'pr-12' : 'pr-3',
            'pl-3',
            leftIcon && 'pl-10',
            error
              ? 'border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]'
              : 'border-[var(--color-border-subtle)]',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {rightAddon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-text-muted)]"
          >
            {rightAddon}
          </span>
        )}
      </div>
      {error ? (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="text-[var(--text-xs)] text-[var(--color-danger)]"
        >
          {error}
        </span>
      ) : helperText ? (
        <span
          id={`${inputId}-helper`}
          className="text-[var(--text-xs)] text-[var(--color-text-muted)]"
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
});
