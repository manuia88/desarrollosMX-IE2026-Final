'use client';

import * as RadixSelect from '@radix-ui/react-select';
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  'aria-label'?: string;
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Seleccionar…',
  disabled,
  name,
  'aria-label': ariaLabel,
}: SelectProps) {
  return (
    <RadixSelect.Root
      {...(value !== undefined && { value })}
      {...(defaultValue !== undefined && { defaultValue })}
      {...(onChange && { onValueChange: onChange })}
      {...(disabled !== undefined && { disabled })}
      {...(name !== undefined && { name })}
    >
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 text-base text-[var(--color-text-primary)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[var(--color-text-muted)]"
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon aria-hidden="true">
          <ChevronDown />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-lg)] data-[state=open]:animate-[pop-in_var(--motion-enter)]"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                {...(opt.disabled !== undefined && { disabled: opt.disabled })}
                className={cn(
                  'relative flex h-9 cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 pr-8 text-sm outline-none',
                  'text-[var(--color-text-primary)]',
                  'data-[highlighted]:bg-[var(--color-state-hover-overlay)]',
                  'data-[state=checked]:bg-[var(--color-state-selected-bg)] data-[state=checked]:text-[var(--color-brand-primary)]',
                  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                )}
              >
                {opt.icon}
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

function ChevronDown() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
