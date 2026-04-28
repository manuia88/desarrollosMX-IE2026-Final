'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

type Highlight = {
  project_id: string;
  project_nombre: string;
  score_type: string;
  score_label: string | null;
  score_value: number | null;
  trend_direction: string | null;
  trend_vs_previous: number | null;
  period_date: string;
};

export function WeeklyCarousel() {
  const t = useTranslations('dev.dashboard.weekly');
  const { data, isLoading } = trpc.developer.getWeeklyHighlights.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });
  const items = (data as Highlight[] | undefined) ?? [];

  const numberStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <Card className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--canon-cream-3)' }}
        >
          {t('eyebrow')}
        </span>
      </header>
      <h2
        className="text-base font-semibold"
        style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
      >
        {t('title')}
      </h2>

      {isLoading ? (
        <p className="text-xs" style={{ color: 'var(--canon-cream-2)' }} aria-busy="true">
          {t('loading')}
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--canon-cream-2)' }}>
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.slice(0, 5).map((h) => {
            const delta = h.trend_vs_previous ?? 0;
            const positive = delta >= 0;
            const sign = positive ? '+' : '';
            return (
              <li
                key={`${h.project_id}-${h.score_type}-${h.period_date}`}
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium" style={{ color: 'var(--canon-cream)' }}>
                    {h.project_nombre}
                  </span>
                  <span
                    className="text-[11px] uppercase tracking-wide"
                    style={{ color: 'var(--canon-cream-3)' }}
                  >
                    {h.score_label ?? h.score_type}
                  </span>
                </div>
                <span
                  role="status"
                  className="text-sm"
                  style={{
                    ...numberStyle,
                    color: positive ? '#34d399' : '#f87171',
                  }}
                  aria-label={t('deltaAria', { value: `${sign}${delta.toFixed(1)}` })}
                >
                  {sign}
                  {delta.toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
