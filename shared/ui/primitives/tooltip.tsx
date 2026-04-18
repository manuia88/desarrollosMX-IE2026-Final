'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from './cn';

const Provider = RadixTooltip.Provider;
const Root = RadixTooltip.Root;
const Trigger = RadixTooltip.Trigger;

const Content = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixTooltip.Content>>(
  function TooltipContent({ className, sideOffset = 6, ...props }, ref) {
    return (
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={8}
          className={cn(
            'z-50 rounded-[var(--radius-sm)] bg-[oklch(0.18_0.02_280)] px-2 py-1 text-xs text-white shadow-[var(--shadow-md)]',
            'data-[state=delayed-open]:animate-[pop-in_var(--motion-enter)]',
            className,
          )}
          {...props}
        />
      </RadixTooltip.Portal>
    );
  },
);

export interface SimpleTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: RadixTooltip.TooltipContentProps['side'];
  delayDuration?: number;
}

export function SimpleTooltip({
  content,
  children,
  side = 'top',
  delayDuration = 400,
}: SimpleTooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <Content side={side}>{content}</Content>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

export const Tooltip = {
  Provider,
  Root,
  Trigger,
  Content,
};
