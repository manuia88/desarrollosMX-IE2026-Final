import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variants: Record<CardVariant, string> = {
  default:
    'bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-xs)]',
  elevated: 'bg-[var(--color-surface-raised)] shadow-[var(--shadow-lg)]',
  outlined: 'bg-transparent border border-[var(--color-border-strong)]',
  filled: 'bg-[var(--color-bg-muted)] border border-[var(--color-border-subtle)]',
  glass:
    'bg-white/60 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10 backdrop-blur-md shadow-[var(--shadow-md)]',
};

const CardRoot = forwardRef<HTMLDivElement, CardProps>(function CardRoot(
  { variant = 'default', className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('rounded-[var(--radius-lg)] overflow-hidden', variants[variant], className)}
      {...props}
    />
  );
});

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'px-6 pt-5 pb-3 border-b border-[var(--color-border-subtle)] flex flex-col gap-1',
        className,
      )}
      {...props}
    />
  );
});

const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardBody(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('px-6 py-5', className)} {...props} />;
});

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'px-6 pt-3 pb-5 border-t border-[var(--color-border-subtle)] flex items-center gap-3',
        className,
      )}
      {...props}
    />
  );
});

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-[var(--text-lg)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] leading-[var(--leading-snug)]',
          className,
        )}
        {...props}
      />
    );
  },
);

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn(
          'text-[var(--text-sm)] text-[var(--color-text-secondary)] leading-[var(--leading-normal)]',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Card = Object.assign(CardRoot, {
  Root: CardRoot,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Title: CardTitle,
  Description: CardDescription,
});
