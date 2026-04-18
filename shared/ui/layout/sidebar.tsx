'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSidebarStore } from '@/shared/hooks/useSidebarStore';
import { Badge } from '../primitives/badge';
import { cn } from '../primitives/cn';

export interface SidebarItem {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
  isActive?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
}

export function Sidebar({ items, header, footer }: SidebarProps) {
  const isExpanded = useSidebarStore((s) => s.isExpanded);
  const expand = useSidebarStore((s) => s.expand);
  const collapse = useSidebarStore((s) => s.collapse);

  return (
    <aside
      aria-label="Navegación principal"
      onMouseEnter={expand}
      onMouseLeave={collapse}
      className={cn(
        'row-start-1 row-span-2 col-start-1 flex flex-col overflow-hidden',
        'bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-r border-[var(--color-border-subtle)]',
        'transition-[width] duration-[var(--duration-base)] ease-[var(--ease-dopamine)]',
        isExpanded ? 'w-[var(--spacing-sidebar-expanded)]' : 'w-[var(--spacing-sidebar-collapsed)]',
      )}
    >
      {header && (
        <div className="h-[var(--spacing-header)] flex items-center px-3 border-b border-[var(--color-border-subtle)]">
          {header}
        </div>
      )}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
        {items.map((item) => (
          <SidebarItemLink key={item.key} item={item} isExpanded={isExpanded} />
        ))}
      </nav>
      {footer && <div className="p-3 border-t border-[var(--color-border-subtle)]">{footer}</div>}
    </aside>
  );
}

function SidebarItemLink({ item, isExpanded }: { item: SidebarItem; isExpanded: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={item.isActive ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 h-10 rounded-[var(--radius-md)] px-3 text-sm font-[var(--font-weight-medium)] outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
        item.isActive
          ? 'text-[var(--color-brand-primary)] bg-[var(--color-state-selected-bg)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-state-hover-overlay)] hover:text-[var(--color-text-primary)]',
      )}
    >
      {item.isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--gradient-p)]"
        />
      )}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{item.icon}</span>
      <span
        className={cn(
          'flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-[var(--duration-fast)]',
          isExpanded ? 'opacity-100' : 'opacity-0',
        )}
      >
        {item.label}
      </span>
      {item.badgeCount && item.badgeCount > 0 && isExpanded && (
        <Badge variant="gradient" size="xs">
          {item.badgeCount}
        </Badge>
      )}
    </Link>
  );
}
