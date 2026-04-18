'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      richColors={false}
      theme="system"
      toastOptions={{
        classNames: {
          toast:
            'bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] shadow-[var(--shadow-lg)] rounded-[var(--radius-md)]',
          title: 'font-[var(--font-weight-semibold)]',
          description: 'text-[var(--color-text-secondary)]',
          actionButton:
            'bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)] rounded-[var(--radius-sm)]',
          cancelButton:
            'bg-[var(--color-bg-muted)] text-[var(--color-text-primary)] rounded-[var(--radius-sm)]',
          success: 'border-l-4 border-l-[var(--color-success)]',
          error: 'border-l-4 border-l-[var(--color-danger)]',
          warning: 'border-l-4 border-l-[var(--color-warning)]',
          info: 'border-l-4 border-l-[var(--color-info)]',
        },
      }}
    />
  );
}

export const toast = sonnerToast;
