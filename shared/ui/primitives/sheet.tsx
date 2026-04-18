'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

export type SheetSide = 'left' | 'right' | 'top' | 'bottom';

const sideStyles: Record<SheetSide, string> = {
  left: 'left-0 top-0 h-full w-80 data-[state=open]:animate-[slide-in_var(--motion-enter)] border-r',
  right:
    'right-0 top-0 h-full w-80 data-[state=open]:animate-[slide-in_var(--motion-enter)] border-l',
  top: 'left-0 top-0 w-full max-h-[85vh] border-b data-[state=open]:animate-[slide-up_var(--motion-enter)]',
  bottom:
    'left-0 bottom-0 w-full max-h-[85vh] border-t data-[state=open]:animate-[slide-up_var(--motion-enter)]',
};

const SheetRoot = RadixDialog.Root;
const SheetTrigger = RadixDialog.Trigger;
const SheetClose = RadixDialog.Close;
const SheetTitle = RadixDialog.Title;
const SheetDescription = RadixDialog.Description;

const SheetContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Content> & { side?: SheetSide }
>(function SheetContent({ className, side = 'right', children, ...props }, ref) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <RadixDialog.Content
        ref={ref}
        className={cn(
          'fixed z-50 bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] p-6 shadow-[var(--shadow-xl)] outline-none',
          sideStyles[side],
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
});

export const Sheet = {
  Root: SheetRoot,
  Trigger: SheetTrigger,
  Close: SheetClose,
  Title: SheetTitle,
  Description: SheetDescription,
  Content: SheetContent,
};
