'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

// STUB ADR-018 — notifications table no shipped + tareas asesor_id-only.
// L-NEW-DEV-NOTIFICATIONS-TABLE-WIRED — agendar BD migration tareas_dev / notifications_dev.
// Mientras: shows pendientes count + landings/cfdis pendientes con disclosure flag.

export type UpcomingActionItem = {
  readonly key: string;
  readonly count: number;
  readonly href?: string;
};

export type UpcomingActionsProps = {
  readonly items: ReadonlyArray<UpcomingActionItem>;
};

export function UpcomingActions({ items }: UpcomingActionsProps) {
  const t = useTranslations('dev.dashboard.upcomingActions');
  const totalPending = items.reduce((acc, it) => acc + it.count, 0);

  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--canon-cream-3)' }}
        >
          {t('eyebrow')}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
          style={{
            background: 'rgba(99,102,241,0.18)',
            color: '#a5b4fc',
          }}
          title={t('disclosureTitle')}
        >
          {t('disclosureBadge')}
        </span>
      </header>

      <h2
        className="text-base font-semibold"
        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
      >
        {t('title')}
      </h2>

      {totalPending === 0 ? (
        <p className="text-xs" style={{ color: 'var(--canon-cream-2)' }}>
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{ color: 'var(--canon-cream)' }}>{t(`items.${it.key}`)}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: it.count > 0 ? 'rgba(251,146,60,0.18)' : 'rgba(148,163,184,0.18)',
                  color: it.count > 0 ? '#fb923c' : 'var(--canon-cream-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {it.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
