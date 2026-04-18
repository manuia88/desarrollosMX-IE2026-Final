'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

const DrawerRoot = RadixDialog.Root;
const DrawerTrigger = RadixDialog.Trigger;
const DrawerClose = RadixDialog.Close;
const DrawerTitle = RadixDialog.Title;
const DrawerDescription = RadixDialog.Description;

const DrawerContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Content>
>(function DrawerContent({ className, children, ...props }, ref) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
      <RadixDialog.Content
        ref={ref}
        className={cn(
          'fixed left-0 bottom-0 z-50 w-full max-h-[90vh] rounded-t-[var(--radius-xl)] bg-[var(--color-surface-raised)] border-t border-[var(--color-border-subtle)] p-4 shadow-[var(--shadow-xl)] outline-none',
          'data-[state=open]:animate-[slide-up_var(--motion-enter)]',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-border-strong)]"
        />
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
});

export const Drawer = {
  Root: DrawerRoot,
  Trigger: DrawerTrigger,
  Close: DrawerClose,
  Title: DrawerTitle,
  Description: DrawerDescription,
  Content: DrawerContent,
};
