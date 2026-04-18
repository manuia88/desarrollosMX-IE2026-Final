'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from './cn';
import type { SelectOption } from './select';

export interface ComboboxProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyState?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  emptyState = 'Sin resultados',
  disabled,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger
        aria-label={ariaLabel}
        disabled={disabled}
        className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 text-base text-[var(--color-text-primary)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn(!selected && 'text-[var(--color-text-muted)]')}>
          {selected?.label ?? placeholder}
        </span>
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
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={4}
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-lg)]"
        >
          <Command>
            <Command.Input
              placeholder="Buscar…"
              className="w-full border-b border-[var(--color-border-subtle)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
            />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="p-3 text-center text-sm text-[var(--color-text-muted)]">
                {emptyState}
              </Command.Empty>
              {options.map((opt) => (
                <Command.Item
                  key={opt.value}
                  value={opt.label}
                  {...(opt.disabled !== undefined && { disabled: opt.disabled })}
                  onSelect={() => {
                    onChange?.(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex h-9 cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm text-[var(--color-text-primary)]',
                    'data-[selected=true]:bg-[var(--color-state-hover-overlay)]',
                    'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
                    opt.value === value &&
                      'bg-[var(--color-state-selected-bg)] text-[var(--color-brand-primary)]',
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
