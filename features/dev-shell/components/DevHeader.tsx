'use client';

import { useTranslations } from 'next-intl';
import { ProjectSwitcher } from '@/shared/ui/developer-shell/ProjectSwitcher';

export interface DevHeaderUser {
  readonly id: string;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly role: string;
}

export interface DevHeaderProps {
  readonly user: DevHeaderUser;
  readonly companyName: string | null;
  readonly unreadCount?: number;
}

function initialsFor(name: string | null): string {
  if (!name) return 'D';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? 'D') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function DevHeader({ user, companyName, unreadCount = 0 }: DevHeaderProps) {
  const t = useTranslations('dev.header');

  return (
    <header
      className="fixed left-[60px] right-0 top-0 z-30 flex h-[72px] items-center justify-between border-b px-6"
      style={{
        background: 'rgba(0, 0, 0, 0.35)',
        borderColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
          style={{
            background: 'linear-gradient(90deg, #6366F1, #EC4899)',
            color: '#fff',
          }}
          aria-hidden="true"
        >
          D
        </span>
        <div className="flex flex-col">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('brand')}
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {companyName ?? t('noCompany')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ProjectSwitcher />
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex h-9 cursor-not-allowed items-center gap-2 rounded-full px-3 text-xs opacity-60"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--canon-cream-2)',
          }}
          aria-label={t('cmdk')}
          title={t('comingSoon')}
        >
          <span aria-hidden="true">⌘K</span>
          <span>{t('search')}</span>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="relative flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full opacity-60"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--canon-cream-2)',
          }}
          aria-label={t('notifications', { count: unreadCount })}
          title={t('comingSoon')}
        >
          <span aria-hidden="true">●</span>
          {unreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full"
              style={{ background: '#EC4899' }}
              aria-hidden="true"
            />
          ) : null}
        </button>
        <div
          role="img"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #EC4899)',
            color: '#fff',
          }}
          aria-label={t('userAvatar', { name: user.name ?? '' })}
        >
          {initialsFor(user.name)}
        </div>
      </div>
    </header>
  );
}
