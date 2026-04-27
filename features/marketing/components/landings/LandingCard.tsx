'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

export interface LandingCardData {
  id: string;
  slug: string;
  template: string;
  is_published: boolean;
  project_ids: string[];
  created_at: string;
}

export interface LandingCardProps {
  landing: LandingCardData;
  locale: string;
}

export function LandingCard({ landing, locale }: LandingCardProps) {
  const t = useTranslations('Marketing');
  const url = landing.is_published ? `/${locale}/l/${landing.slug}` : null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-base font-bold text-[var(--canon-white-pure)] truncate"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {landing.slug}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            landing.is_published
              ? 'bg-[color:rgba(99,102,241,0.18)] text-[color:var(--canon-indigo-2)]'
              : 'bg-[color:rgba(255,255,255,0.08)] text-[color:rgba(255,255,255,0.65)]'
          }`}
        >
          {landing.is_published ? t('landings.status.published') : t('landings.status.draft')}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs text-[color:rgba(255,255,255,0.65)]">
        <div>
          <dt className="font-semibold">{t('landings.card.template')}</dt>
          <dd>{landing.template}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t('landings.card.projects')}</dt>
          <dd>{landing.project_ids.length}</dd>
        </div>
      </dl>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[color:var(--canon-indigo-2)] hover:underline"
        >
          {t('landings.card.openPublic')}
        </a>
      ) : null}
    </Card>
  );
}
