'use client';

import { useTranslations } from 'next-intl';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

interface LandingRow {
  readonly id: string;
  readonly slug: string;
  readonly is_published: boolean;
  readonly published_at: string | null;
  readonly created_at: string;
}

export function TabLandings() {
  const t = useTranslations('dev.marketing.landingsTab');
  const q = trpc.marketing.landings.list.useQuery({ limit: 50 }, { retry: false });
  const landings = (q.data ?? []) as LandingRow[];

  return (
    <Card className="space-y-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <span className="text-xs text-[color:var(--color-text-secondary)]">
          {t('summary', { total: landings.length })}
        </span>
      </header>
      {q.isLoading ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>
      ) : q.error ? (
        <p className="text-sm text-rose-700">{q.error.message}</p>
      ) : landings.length === 0 ? (
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {landings.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-md border border-[color:var(--color-border-subtle)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-[color:var(--color-text-primary)]">/l/{l.slug}</p>
                <p className="text-[11px] text-[color:var(--color-text-secondary)]">
                  {t('createdAt', { date: l.created_at.slice(0, 10) })}
                </p>
              </div>
              <span
                className={
                  l.is_published
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800'
                    : 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800'
                }
              >
                {l.is_published ? t('published') : t('draft')}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="rounded-md border border-violet-200 bg-violet-50 p-2 text-[11px] text-violet-900">
        {t('reusedFromAsesor')}
      </p>
    </Card>
  );
}
