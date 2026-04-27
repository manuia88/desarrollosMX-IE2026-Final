'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useSidebarHover } from '@/features/asesor-shell/hooks/use-sidebar-hover';
import { ASESOR_NAV_ITEMS, type ModuleId } from '@/features/asesor-shell/lib/nav-items';
import { cn } from '@/shared/ui/primitives/canon/cn';

interface AsesorSidebarProps {
  activeModuleId: ModuleId | null;
  locale: string;
  forceCollapsed?: boolean;
}

export function AsesorSidebar({ activeModuleId, locale, forceCollapsed }: AsesorSidebarProps) {
  const t = useTranslations('AsesorShell');
  const hover = useSidebarHover({
    collapsed: 60,
    expanded: 240,
    delayMs: 250,
    closeDelayMs: 400,
    disabled: forceCollapsed === true,
  });

  const containerStyle: CSSProperties = {
    width: `${hover.width}px`,
    background: 'var(--surface-recessed)',
    borderRight: '1px solid var(--canon-border)',
    color: 'var(--canon-cream)',
    transition: `width var(--canon-duration-normal) var(--canon-ease-out)`,
  };

  const primary = ASESOR_NAV_ITEMS.filter((i) => i.group === 'primary');
  const secondary = ASESOR_NAV_ITEMS.filter((i) => i.group === 'secondary');

  return (
    <aside
      aria-label={t('sidebar.aria')}
      data-expanded={hover.expanded}
      onMouseEnter={hover.onMouseEnter}
      onMouseLeave={hover.onMouseLeave}
      onFocusCapture={hover.onFocusCapture}
      onBlurCapture={hover.onBlurCapture}
      className="fixed inset-y-0 left-0 z-40 flex flex-col"
      style={containerStyle}
    >
      <div className="flex h-[72px] items-center justify-center px-3">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
          style={{
            background: 'var(--canon-gradient)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
            fontFamily: 'var(--font-display)',
          }}
          aria-hidden="true"
        >
          DMX
        </span>
      </div>
      <nav
        aria-label={t('sidebar.navAria')}
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4"
      >
        {primary.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeModuleId === item.id}
            expanded={hover.expanded}
            label={t(item.labelKey)}
            locale={locale}
          />
        ))}
        <div
          aria-hidden="true"
          className="my-2 h-px"
          style={{ background: 'var(--canon-border)' }}
        />
        {secondary.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeModuleId === item.id}
            expanded={hover.expanded}
            label={t(item.labelKey)}
            locale={locale}
          />
        ))}
      </nav>
    </aside>
  );
}

interface NavItemProps {
  item: (typeof ASESOR_NAV_ITEMS)[number];
  active: boolean;
  expanded: boolean;
  label: string;
  locale: string;
}

function NavItem({ item, active, expanded, label, locale }: NavItemProps) {
  const Icon = item.Icon;
  const tint = `var(${item.tintToken})`;
  const linkStyle: CSSProperties = {
    color: 'var(--canon-cream)',
    ['--mod-tint' as string]: tint,
    ['--icon-color' as string]: active
      ? tint
      : `color-mix(in oklab, ${tint} 65%, var(--canon-cream) 35%)`,
    ...(active
      ? {
          background: `color-mix(in oklab, ${tint} 14%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tint} 30%, transparent)`,
        }
      : {}),
  };

  return (
    <Link
      href={`/${locale}${item.route}`}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={cn(
        'group relative flex h-11 items-center gap-3 rounded-[12px] px-3 transition-colors',
        'hover:bg-[color:rgba(255,255,255,0.06)]',
        active ? '' : 'hover:[--icon-color:var(--mod-tint)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--canon-bg)]',
      )}
      style={linkStyle}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r"
          style={{ background: tint }}
        />
      ) : null}
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center transition-colors"
        style={{
          width: 22,
          height: 22,
          color: 'var(--icon-color)',
        }}
      >
        <Icon size={22} />
      </span>
      {expanded ? (
        <span
          className="truncate text-[13px] font-medium"
          style={{
            color: active ? tint : 'var(--canon-cream)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}
