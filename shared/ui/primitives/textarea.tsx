'use client';

import type { TextareaHTMLAttributes } from 'react';
import { forwardRef, useEffect, useId, useRef } from 'react';
import { cn } from './cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, autoResize = false, id, className, value, onChange, ...props },
  ref,
) {
  const reactId = useId();
  const textareaId = id ?? reactId;
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: value triggers re-render so effect re-runs to resize
  useEffect(() => {
    if (!autoResize || !innerRef.current) return;
    const el = innerRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize, value]);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const describedBy = error
    ? `${textareaId}-error`
    : helperText
      ? `${textareaId}-helper`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-[var(--text-sm)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      )}
      <textarea
        ref={setRefs}
        id={textareaId}
        value={value}
        onChange={onChange}
        className={cn(
          'w-full rounded-[var(--radius-md)] border bg-[var(--color-surface-raised)] px-3 py-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          autoResize ? 'overflow-hidden resize-none min-h-[80px]' : 'min-h-[80px] resize-y',
          error
            ? 'border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]'
            : 'border-[var(--color-border-subtle)]',
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <span
          id={`${textareaId}-error`}
          role="alert"
          className="text-[var(--text-xs)] text-[var(--color-danger)]"
        >
          {error}
        </span>
      ) : helperText ? (
        <span
          id={`${textareaId}-helper`}
          className="text-[var(--text-xs)] text-[var(--color-text-muted)]"
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
});
