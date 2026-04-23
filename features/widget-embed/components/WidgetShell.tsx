'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/primitives/cn';
import type { WidgetCustomization } from '../types';

export interface WidgetShellProps {
  readonly children: ReactNode;
  readonly customization?: WidgetCustomization | undefined;
  readonly ctaUrl: string;
  readonly ctaLabel: string;
  readonly poweredByLabel: string;
  readonly ariaLabel: string;
  readonly className?: string;
}

function themeClass(theme: WidgetCustomization['theme']): string {
  if (theme === 'dark') return 'dmx-widget-theme-dark';
  if (theme === 'light') return 'dmx-widget-theme-light';
  return 'dmx-widget-theme-auto';
}

export function WidgetShell({
  children,
  customization,
  ctaUrl,
  ctaLabel,
  poweredByLabel,
  ariaLabel,
  className,
}: WidgetShellProps) {
  const theme = customization?.theme ?? 'auto';
  return (
    <section
      data-dmx-widget="shell"
      data-dmx-theme={theme}
      aria-label={ariaLabel}
      className={cn(themeClass(theme), className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3, 0.75rem)',
        padding: 'var(--space-4, 1rem)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
        background: 'var(--color-surface-raised, #ffffff)',
        color: 'var(--color-text-primary, #0f172a)',
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2, 0.5rem)',
          paddingTop: 'var(--space-2, 0.5rem)',
          borderTop: '1px solid var(--color-border-subtle, rgba(0,0,0,0.06))',
          fontSize: 'var(--text-xs, 0.75rem)',
          color: 'var(--color-text-secondary, #475569)',
        }}
      >
        <span aria-hidden="true">{poweredByLabel}</span>
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--color-accent-primary, oklch(0.67 0.19 285))',
            fontWeight: 'var(--font-weight-semibold, 600)',
            textDecoration: 'none',
          }}
          aria-label={ctaLabel}
        >
          {ctaLabel}
        </a>
      </footer>
    </section>
  );
}
