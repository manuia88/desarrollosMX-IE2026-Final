'use client';

// BLOQUE 11.R.3 (U13) — contagion paths list rendered en landing.

import { useTranslations } from 'next-intl';
import { trpc } from '@/shared/lib/trpc/client';

export function ContagionPathsList() {
  const t = useTranslations('Constellations.contagion');
  const q = trpc.constellations.getContagionPaths.useQuery(
    { topN: 5, countryCode: 'MX' },
    { staleTime: 5 * 60 * 1000 },
  );

  if (q.isLoading) {
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  }
  if (q.isError) {
    return (
      <p role="alert" className="text-sm text-[color:var(--color-danger)]">
        {t('error')}
      </p>
    );
  }
  const paths = q.data ?? [];
  if (paths.length === 0) {
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty')}</p>;
  }
  return (
    <ol className="space-y-2">
      {paths.map((p, idx) => (
        <li
          key={`${p.ghost_source.zone_id}-${p.real_target.zone_id}`}
          className="flex items-center gap-3 rounded-md border border-[color:var(--color-border)] p-3 text-sm"
        >
          <span className="text-xs text-[color:var(--color-text-secondary)]">#{idx + 1}</span>
          <span className="font-semibold text-[color:var(--color-warning)]">
            {p.ghost_source.zone_label ?? t('unlabeled_zone')}
          </span>
          <span aria-hidden="true" className="text-[color:var(--color-text-secondary)]">
            →
          </span>
          <span className="font-medium">{p.real_target.zone_label ?? t('unlabeled_zone')}</span>
          <span className="ml-auto text-xs text-[color:var(--color-text-secondary)]">
            {t('weight_label')}: {p.path_weight.toFixed(0)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default ContagionPathsList;
