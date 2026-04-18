'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '../primitives/cn';

export interface HeaderProps {
  breadcrumbSlot?: ReactNode;
  searchSlot?: ReactNode;
  localeSwitcherSlot?: ReactNode;
  currencySwitcherSlot?: ReactNode;
  notificationsSlot?: ReactNode;
  profileSlot?: ReactNode;
}

export function Header({
  breadcrumbSlot,
  searchSlot,
  localeSwitcherSlot,
  currencySwitcherSlot,
  notificationsSlot,
  profileSlot,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 row-start-1 col-start-2 h-[var(--spacing-header)] flex items-center gap-4 px-6',
        'bg-white/75 dark:bg-neutral-900/75 backdrop-blur-xl border-b border-[var(--color-border-subtle)]',
        'transition-shadow duration-[var(--duration-fast)]',
        scrolled ? 'shadow-[var(--shadow-sm)]' : 'shadow-none',
      )}
    >
      <div className="min-w-0 flex-1 flex items-center gap-3">{breadcrumbSlot}</div>
      {searchSlot && <div className="flex items-center">{searchSlot}</div>}
      <div className="flex items-center gap-2">
        {localeSwitcherSlot}
        {currencySwitcherSlot}
        {notificationsSlot}
        {profileSlot}
      </div>
    </header>
  );
}
