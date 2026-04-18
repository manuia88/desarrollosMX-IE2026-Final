'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '../primitives/cn';

type ThemeOption = 'system' | 'light' | 'dark';

const OPTIONS: { value: ThemeOption; label: string; icon: string }[] = [
  { value: 'light', label: 'Claro', icon: '☀' },
  { value: 'dark', label: 'Oscuro', icon: '☾' },
  { value: 'system', label: 'Sistema', icon: '◐' },
];

export interface ThemeToggleProps {
  onPersist?: (theme: ThemeOption) => void;
}

export function ThemeToggle({ onPersist }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = (mounted ? (theme as ThemeOption) : 'system') ?? 'system';

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-0.5"
    >
      {OPTIONS.map((opt) => {
        const isActive = activeTheme === opt.value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: radiogroup pattern with custom pill visuals, role+aria-checked are sufficient
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={opt.label}
            onClick={() => {
              setTheme(opt.value);
              onPersist?.(opt.value);
            }}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-pill)] text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
              isActive
                ? 'bg-[var(--color-brand-primary)] text-[var(--color-text-inverse)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover-overlay)]',
            )}
          >
            <span aria-hidden="true">{opt.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
