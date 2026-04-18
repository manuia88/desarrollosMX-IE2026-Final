'use client';

import type { ReactNode } from 'react';
import { useSidebarStore } from '@/shared/hooks/useSidebarStore';
import { cn } from '../primitives/cn';

export interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  const isExpanded = useSidebarStore((s) => s.isExpanded);

  return (
    <div
      className={cn(
        'grid min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)]',
        'grid-rows-[var(--spacing-header)_1fr]',
        'transition-[grid-template-columns] duration-[var(--duration-base)] ease-[var(--ease-dopamine)]',
        isExpanded
          ? 'grid-cols-[var(--spacing-sidebar-expanded)_1fr]'
          : 'grid-cols-[var(--spacing-sidebar-collapsed)_1fr]',
        className,
      )}
      style={{
        paddingRight: 'calc(var(--spacing-copilot-collapsed) + 24px)',
      }}
    >
      {sidebar}
      {header}
      <main className="row-start-2 col-start-2 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
