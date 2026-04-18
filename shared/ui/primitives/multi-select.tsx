'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Tag } from './badge';
import { cn } from './cn';
import type { SelectOption } from './select';

export interface MultiSelectProps {
  options: SelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  emptyState?: ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Seleccionar…',
  emptyState = 'Sin resultados',
  disabled,
  'aria-label': ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOptions = options.filter((o) => value.includes(o.value));

  const toggle = (v: string) => {
    if (value.includes(v)) onChange?.(value.filter((x) => x !== v));
    else onChange?.([...value, v]);
  };

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger
        aria-label={ariaLabel}
        disabled={disabled}
        className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2 py-1.5 text-base text-[var(--color-text-primary)] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex flex-wrap items-center gap-1">
          {selectedOptions.length === 0 ? (
            <span className="pl-1 text-[var(--color-text-muted)]">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <Tag
                key={opt.value}
                onRemove={() => {
                  toggle(opt.value);
                }}
              >
                {opt.label}
              </Tag>
            ))
          )}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="h-3 w-3 flex-shrink-0"
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
              {options.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <Command.Item
                    key={opt.value}
                    value={opt.label}
                    {...(opt.disabled !== undefined && { disabled: opt.disabled })}
                    onSelect={() => toggle(opt.value)}
                    className={cn(
                      'flex h-9 cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm text-[var(--color-text-primary)]',
                      'data-[selected=true]:bg-[var(--color-state-hover-overlay)]',
                      checked && 'bg-[var(--color-state-selected-bg)]',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-sm border',
                        checked
                          ? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-[var(--color-text-inverse)]'
                          : 'border-[var(--color-border-strong)]',
                      )}
                    >
                      {checked && (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 12 12"
                          className="h-2.5 w-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {opt.icon}
                    {opt.label}
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
