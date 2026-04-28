'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { DEV_NAV_ITEMS, type DevModuleId } from '@/features/dev-shell/lib/nav-items';

interface DevSidebarProps {
  readonly locale: string;
}

function activeIdFromPath(pathname: string, locale: string): DevModuleId | null {
  const prefix = `/${locale}/desarrolladores/`;
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length).split('/')[0] ?? '';
  const item = DEV_NAV_ITEMS.find((n) => n.route.endsWith(`/${segment}`));
  return item ? item.id : null;
}

export function DevSidebar({ locale }: DevSidebarProps) {
  const t = useTranslations();
  const pathname = usePathname() ?? '';
  const activeId = useMemo(() => activeIdFromPath(pathname, locale), [pathname, locale]);

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-[60px] flex-col items-center border-r py-4"
      style={{
        background: 'rgba(0, 0, 0, 0.35)',
        borderColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
      aria-label={t('dev.sidebar.aria')}
    >
      <nav className="flex flex-1 flex-col gap-2 pt-4" aria-label={t('dev.sidebar.nav')}>
        {DEV_NAV_ITEMS.map((item) => {
          const Icon = item.Icon;
          const isActive = activeId === item.id;
          const isDisabled = item.disabled === true;
          const baseClass = 'group relative flex h-10 w-10 items-center justify-center rounded-xl';
          const activeStyle = isActive
            ? { background: 'rgba(99,102,241,0.15)', color: 'var(--canon-cream)' }
            : { color: 'var(--canon-cream-2)' };

          if (isDisabled) {
            return (
              <button
                key={item.id}
                type="button"
                disabled
                aria-disabled="true"
                aria-label={`${t(item.labelKey)} — ${item.futurePhase ?? ''}`}
                title={`${t(item.labelKey)} · ${t('dev.sidebar.comingSoon', { phase: item.futurePhase ?? '' })}`}
                className={`${baseClass} cursor-not-allowed opacity-40`}
                style={activeStyle}
                data-disabled="true"
              >
                <Icon size={18} aria-hidden="true" />
                {item.badgeKey ? (
                  <span
                    className="absolute -right-1 -top-1 inline-flex h-3 min-w-[18px] items-center justify-center rounded-full px-1 text-[8px] font-semibold uppercase"
                    style={{
                      background: 'linear-gradient(90deg, #6366F1, #EC4899)',
                      color: '#fff',
                    }}
                    aria-hidden="true"
                  >
                    {t(item.badgeKey)}
                  </span>
                ) : null}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={`/${locale}${item.route}`}
              className={baseClass}
              style={activeStyle}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t(item.labelKey)}
              data-active={isActive ? 'true' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
