'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

const Root = RadixDialog.Root;
const Trigger = RadixDialog.Trigger;
const Close = RadixDialog.Close;
const Portal = RadixDialog.Portal;

const Overlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixDialog.Overlay>>(
  function DialogOverlay({ className, ...props }, ref) {
    return (
      <RadixDialog.Overlay
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'data-[state=open]:animate-in data-[state=open]:fade-in',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out',
          className,
        )}
        {...props}
      />
    );
  },
);

const Content = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Content> & { overlayClassName?: string }
>(function DialogContent({ className, children, overlayClassName, ...props }, ref) {
  return (
    <Portal>
      <Overlay className={overlayClassName} />
      <RadixDialog.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] p-6 shadow-[var(--shadow-xl)] outline-none',
          'data-[state=open]:animate-[pop-in_var(--motion-enter)]',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </Portal>
  );
});

function DialogHeader({ className, ...props }: { className?: string; children?: ReactNode }) {
  return <div className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />;
}

function DialogFooter({ className, ...props }: { className?: string; children?: ReactNode }) {
  return <div className={cn('flex items-center justify-end gap-2 mt-6', className)} {...props} />;
}

const Title = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<typeof RadixDialog.Title>>(
  function DialogTitle({ className, ...props }, ref) {
    return (
      <RadixDialog.Title
        ref={ref}
        className={cn(
          'text-[var(--text-lg)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]',
          className,
        )}
        {...props}
      />
    );
  },
);

const Description = forwardRef<
  HTMLParagraphElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <RadixDialog.Description
      ref={ref}
      className={cn('text-[var(--text-sm)] text-[var(--color-text-secondary)]', className)}
      {...props}
    />
  );
});

export const Dialog = {
  Root,
  Trigger,
  Close,
  Portal,
  Overlay,
  Content,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title,
  Description,
};
