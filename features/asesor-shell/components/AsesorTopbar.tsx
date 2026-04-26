'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useCommandPalette } from '@/features/asesor-shell/hooks/use-command-palette';
import type { BreadcrumbSegment } from '@/features/asesor-shell/lib/active-module';
import { IconBell, IconChevronRight, IconSearch } from '@/shared/ui/icons/canon-icons';
import { cn } from '@/shared/ui/primitives/canon/cn';

export type AvailabilityStatus = 'disponible' | 'ocupado' | 'en_visita';

export interface ShellUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

interface AsesorTopbarProps {
  user: ShellUser;
  breadcrumb: BreadcrumbSegment[];
  unreadCount?: number;
}

const AVAILABILITY: Record<AvailabilityStatus, { tokenColor: string; key: string }> = {
  disponible: { tokenColor: 'var(--canon-green)', key: 'topbar.availability.disponible' },
  ocupado: { tokenColor: 'var(--canon-amber)', key: 'topbar.availability.ocupado' },
  en_visita: { tokenColor: 'var(--canon-indigo-2)', key: 'topbar.availability.en_visita' },
};

export function AsesorTopbar({ user, breadcrumb, unreadCount = 0 }: AsesorTopbarProps) {
  const t = useTranslations('AsesorShell');
  const palette = useCommandPalette();
  const [availability, setAvailability] = useState<AvailabilityStatus>('disponible');

  const containerStyle: CSSProperties = {
    background: 'rgba(13, 16, 23, 0.70)',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
    borderBottom: '1px solid var(--canon-border)',
    color: 'var(--canon-cream)',
  };

  return (
    <header
      className="fixed left-[60px] right-[55px] top-0 z-40 flex h-[72px] items-center gap-4 px-6"
      style={containerStyle}
    >
      <h2 className="sr-only">{t('topbar.aria')}</h2>
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-[13px]">
          <li className="text-[var(--canon-cream-2)]" style={{ fontFamily: 'var(--font-body)' }}>
            {t('breadcrumb.root')}
          </li>
          {breadcrumb.map((segment, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: composite key with labelKey, breadcrumb is stable per route
            <li key={`${segment.labelKey}-${index}`} className="flex items-center gap-2">
              <IconChevronRight size={14} className="text-[var(--canon-cream-3)]" />
              <span
                aria-current={index === breadcrumb.length - 1 ? 'page' : undefined}
                className={cn(
                  'truncate',
                  index === breadcrumb.length - 1
                    ? 'font-semibold text-[var(--canon-cream)]'
                    : 'text-[var(--canon-cream-2)]',
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t(segment.labelKey)}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        onClick={palette.open}
        aria-keyshortcuts="Meta+K Control+K"
        aria-haspopup="dialog"
        className="hidden h-[38px] min-w-[260px] items-center gap-2 rounded-full border px-3 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)] md:inline-flex"
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.08)',
          color: 'var(--canon-cream-2)',
        }}
      >
        <IconSearch size={14} />
        <span className="flex-1 text-left" style={{ fontFamily: 'var(--font-body)' }}>
          {t('topbar.searchPlaceholder')}
        </span>
        <kbd
          className="rounded border px-1.5 py-0.5 text-[10px] font-mono"
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.10)',
            color: 'var(--canon-cream-3)',
          }}
        >
          ⌘K
        </kbd>
      </button>

      <fieldset
        aria-label={t('topbar.availability.aria')}
        className="hidden items-center gap-1 rounded-full border p-1 lg:inline-flex"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {(['disponible', 'ocupado', 'en_visita'] as const).map((status) => {
          const meta = AVAILABILITY[status];
          const isActive = availability === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              onClick={() => setAvailability(status)}
              className="rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)]"
              style={{
                color: isActive ? meta.tokenColor : 'var(--canon-cream-2)',
                background: isActive
                  ? `color-mix(in oklab, ${meta.tokenColor} 18%, transparent)`
                  : 'transparent',
              }}
            >
              {t(meta.key)}
            </button>
          );
        })}
      </fieldset>

      <button
        type="button"
        aria-label={t('topbar.notifications', { count: unreadCount })}
        disabled
        className="relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)] disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.08)',
          color: 'var(--canon-cream)',
        }}
      >
        <IconBell size={16} />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: 'var(--canon-rose)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <span
        title={user.name ?? user.role}
        className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border text-[12px] font-bold uppercase"
        style={{
          background: 'var(--surface-elevated)',
          borderColor: 'var(--canon-border-2)',
          color: 'var(--canon-indigo-2)',
        }}
      >
        {(user.name ?? user.role).slice(0, 2)}
      </span>
    </header>
  );
}
