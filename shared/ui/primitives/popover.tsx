'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

const Root = RadixPopover.Root;
const Trigger = RadixPopover.Trigger;
const Anchor = RadixPopover.Anchor;
const Close = RadixPopover.Close;

const Content = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixPopover.Content>>(
  function PopoverContent({ className, sideOffset = 8, align = 'center', ...props }, ref) {
    return (
      <RadixPopover.Portal>
        <RadixPopover.Content
          ref={ref}
          sideOffset={sideOffset}
          align={align}
          collisionPadding={8}
          className={cn(
            'z-50 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-lg)] outline-none',
            'data-[state=open]:animate-[pop-in_var(--motion-enter)]',
            className,
          )}
          {...props}
        />
      </RadixPopover.Portal>
    );
  },
);

export const Popover = {
  Root,
  Trigger,
  Anchor,
  Close,
  Content,
};
