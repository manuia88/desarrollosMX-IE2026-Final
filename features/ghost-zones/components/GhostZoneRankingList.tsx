'use client';

// BLOQUE 11.Q.3.3 — Ghost Zones ranking list Pro+.
// Fila por colonia: label (zone-label-resolver), ghost_score (bar),
// hype_halving_warning badge (U2), breakdown 3 componentes (U1),
// expand → timeline 12m (U3).

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GhostZoneRanking, HypeLevel } from '@/features/ghost-zones/types';
import { trpc } from '@/shared/lib/trpc/client';
import { GhostScoreBreakdownView } from './GhostScoreBreakdown';
import { GhostTimelineChart } from './GhostTimelineChart';

interface GhostZoneRankingListProps {
  readonly locale: string;
}

const HYPE_LEVEL_TOKEN: Record<HypeLevel, string> = {
  sub_valued: 'text-[color:var(--color-success)]',
  aligned: 'text-[color:var(--color-text-secondary)]',
  over_hyped: 'text-[color:var(--color-warning)]',
  extreme_hype: 'text-[color:var(--color-danger)]',
};

export function GhostZoneRankingList({ locale }: GhostZoneRankingListProps) {
  const t = useTranslations('GhostZones.ranking');
  const tHype = useTranslations('GhostZones.hype_levels');
  const query = trpc.ghostZones.ranking.useQuery(
    { topN: 50, countryCode: 'MX' },
    { staleTime: 5 * 60 * 1000 },
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (query.isLoading) {
    return (
      <output
        aria-busy="true"
        aria-label={t('loading')}
        className="block min-h-[240px] py-6 text-sm text-[color:var(--color-text-secondary)]"
      >
        {t('loading')}
      </output>
    );
  }

  if (query.isError) {
    const code = query.error?.data?.code;
    if (code === 'UNAUTHORIZED') {
      return (
        <section className="space-y-3 rounded-lg border border-[color:var(--color-border)] p-6">
          <h2 className="text-lg font-semibold">{t('auth_required_title')}</h2>
          <p className="text-sm text-[color:var(--color-text-secondary)]">
            {t('auth_required_body')}
          </p>
          <a
            href={`/${locale}/auth/signup`}
            className="inline-flex rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-on-accent)]"
          >
            {t('auth_required_cta')}
          </a>
        </section>
      );
    }
    return (
      <p role="alert" className="text-sm text-[color:var(--color-danger)]">
        {t('load_error')}
      </p>
    );
  }

  const rows = query.data ?? [];
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text-secondary)]">
        {t('empty_state')}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {rows.map((row: GhostZoneRanking, idx: number) => {
        const isExpanded = expandedId === row.colonia_id;
        const hypeToken = HYPE_LEVEL_TOKEN[row.hype_level];
        return (
          <li
            key={row.colonia_id}
            className="rounded-lg border border-[color:var(--color-border)] p-4"
          >
            <header className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-xs text-[color:var(--color-text-secondary)]">
                  #{row.rank ?? idx + 1}
                </p>
                <h3 className="text-lg font-semibold">
                  {row.colonia_label ?? t('unlabeled_zone')}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-semibold uppercase tracking-wider ${hypeToken}`}>
                    {tHype(row.hype_level)}
                  </span>
                  {row.hype_halving_warning ? (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--color-danger-muted,rgba(239,68,68,0.15))] px-2 py-0.5 text-[color:var(--color-danger)]">
                      {t('hype_halving_badge')}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[color:var(--color-text-secondary)]">
                  {t('ghost_score_label')}
                </p>
                <p className="text-2xl font-bold text-[color:var(--color-accent)]">
                  {row.ghost_score.toFixed(1)}
                </p>
                {typeof row.score_total === 'number' ? (
                  <p className="mt-0.5 text-[10px] text-[color:var(--color-text-secondary)]">
                    {t('dmx_avg_label')}: {row.score_total.toFixed(0)}
                  </p>
                ) : null}
              </div>
            </header>

            <GhostScoreBreakdownView breakdown={row.breakdown} />

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : row.colonia_id)}
                className="font-medium text-[color:var(--color-accent)] hover:underline"
                aria-expanded={isExpanded}
              >
                {isExpanded ? t('hide_timeline') : t('show_timeline')}
              </button>
              <span className="text-[color:var(--color-text-secondary)]">
                {t('buzz_summary', {
                  search: row.search_volume.toLocaleString('es-MX'),
                  press: row.press_mentions,
                })}
              </span>
            </div>

            {isExpanded ? (
              <div className="mt-3">
                <GhostTimelineSection coloniaId={row.colonia_id} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function GhostTimelineSection({ coloniaId }: { readonly coloniaId: string }) {
  const t = useTranslations('GhostZones.timeline');
  const q = trpc.ghostZones.timeline12m.useQuery(
    { coloniaId, months: 12, countryCode: 'MX' },
    { staleTime: 5 * 60 * 1000 },
  );
  if (q.isLoading) {
    return <p className="text-xs text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  }
  if (q.isError) {
    return (
      <p role="alert" className="text-xs text-[color:var(--color-danger)]">
        {t('error')}
      </p>
    );
  }
  return <GhostTimelineChart data={q.data ?? []} height={140} />;
}

export default GhostZoneRankingList;
