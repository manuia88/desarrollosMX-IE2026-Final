'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/shared/ui/primitives/cn';

interface Props {
  readonly disclosure: 'observed' | 'mixed' | 'synthetic';
  readonly className?: string;
}

export function DisclosureBadge({ disclosure, className }: Props) {
  const t = useTranslations('dev.analytics.disclosure');
  const tone =
    disclosure === 'observed'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
      : disclosure === 'mixed'
        ? 'border-amber-300 bg-amber-50 text-amber-900'
        : 'border-violet-300 bg-violet-50 text-violet-900';
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        tone,
        className,
      )}
      aria-label={t(`${disclosure}Aria`)}
      title={t(`${disclosure}Tooltip`)}
    >
      {t(disclosure)}
    </span>
  );
}
