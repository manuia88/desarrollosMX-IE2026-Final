'use client';

import { useTranslations } from 'next-intl';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export interface DedupeIndicatorProps {
  readonly duplicateOfJobId: string | null;
  readonly pagesChanged?: ReadonlyArray<number>;
  readonly previousJobShortId?: string;
}

export function DedupeIndicator({
  duplicateOfJobId,
  pagesChanged,
  previousJobShortId,
}: DedupeIndicatorProps) {
  const t = useTranslations('dev.documents.dedupe');

  if (!duplicateOfJobId && (!pagesChanged || pagesChanged.length === 0)) {
    return null;
  }

  const shortId = previousJobShortId ?? duplicateOfJobId?.slice(0, 8) ?? '';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {duplicateOfJobId ? (
        <DisclosurePill tone="amber" aria-label={t('duplicate_of', { id: shortId })}>
          {t('duplicate_of', { id: shortId })}
        </DisclosurePill>
      ) : null}
      {pagesChanged && pagesChanged.length > 0 ? (
        <DisclosurePill
          tone="indigo"
          aria-label={t('pages_changed', { count: pagesChanged.length })}
          title={t('pages_list', { pages: pagesChanged.map((p) => p + 1).join(', ') })}
        >
          {t('pages_changed', { count: pagesChanged.length })}
        </DisclosurePill>
      ) : null}
    </div>
  );
}
