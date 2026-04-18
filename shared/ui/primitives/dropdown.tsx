'use client';

import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

const Root = RadixDropdown.Root;
const Trigger = RadixDropdown.Trigger;
const Portal = RadixDropdown.Portal;
const Group = RadixDropdown.Group;
const Sub = RadixDropdown.Sub;
const SubTrigger = RadixDropdown.SubTrigger;
const Label = RadixDropdown.Label;

const Content = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixDropdown.Content>>(
  function DropdownContent({ className, sideOffset = 4, ...props }, ref) {
    return (
      <Portal>
        <RadixDropdown.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(
            'z-50 min-w-[180px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-1 shadow-[var(--shadow-lg)]',
            'data-[state=open]:animate-[pop-in_var(--motion-enter)]',
            className,
          )}
          {...props}
        />
      </Portal>
    );
  },
);

const Item = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixDropdown.Item>>(
  function DropdownItem({ className, ...props }, ref) {
    return (
      <RadixDropdown.Item
        ref={ref}
        className={cn(
          'relative flex h-9 cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm text-[var(--color-text-primary)] outline-none',
          'data-[highlighted]:bg-[var(--color-state-hover-overlay)]',
          'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

const Separator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDropdown.Separator>
>(function DropdownSeparator({ className, ...props }, ref) {
  return (
    <RadixDropdown.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-[var(--color-border-subtle)]', className)}
      {...props}
    />
  );
});

export const Dropdown = {
  Root,
  Trigger,
  Portal,
  Group,
  Sub,
  SubTrigger,
  Label,
  Content,
  Item,
  Separator,
};
