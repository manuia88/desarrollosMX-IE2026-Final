'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export interface StudioCrossLinkBannerProps {
  locale: string;
}

export function StudioCrossLinkBanner({ locale }: StudioCrossLinkBannerProps) {
  const t = useTranslations('Marketing');
  return (
    <Link
      href={`/${locale}/asesores/studio`}
      className="block rounded-2xl border border-[color:rgba(255,255,255,0.10)] bg-[color:rgba(99,102,241,0.06)] p-5 transition-colors hover:bg-[color:rgba(99,102,241,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span
            className="text-base font-extrabold text-[var(--canon-white-pure)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('studioBanner.title')}
          </span>
          <span className="text-sm text-[color:rgba(255,255,255,0.70)]">
            {t('studioBanner.body')}
          </span>
        </div>
        <DisclosurePill tone="violet">{t('studioBanner.coming')}</DisclosurePill>
      </div>
    </Link>
  );
}
