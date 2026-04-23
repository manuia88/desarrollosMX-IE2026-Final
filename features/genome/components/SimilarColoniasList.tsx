'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { SimilarityResult } from '@/features/genome/types';

export interface SimilarColoniasListProps {
  readonly indexCode: string;
  readonly locale: string;
  readonly results: readonly SimilarityResult[];
  readonly sourceColoniaId: string;
  readonly minLiv: number | null;
}

export function SimilarColoniasList({
  indexCode,
  locale,
  results,
  sourceColoniaId,
  minLiv,
}: SimilarColoniasListProps) {
  const t = useTranslations('Genome');
  const router = useRouter();
  const searchParams = useSearchParams();

  const onToggleLiv = useCallback(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
    if (minLiv === null) {
      sp.set('min_liv', '70');
    } else {
      sp.delete('min_liv');
    }
    router.push(`?${sp.toString()}`);
  }, [minLiv, router, searchParams]);

  if (results.length === 0) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-sm text-[color:var(--color-text-secondary)]"
      >
        {t('similares.empty')}
      </div>
    );
  }

  return (
    <section aria-labelledby="similar-colonias-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="similar-colonias-heading"
          className="text-lg font-semibold text-[color:var(--color-text-primary)]"
        >
          {t('similares.results_heading', { count: results.length })}
        </h2>
        <button
          type="button"
          onClick={onToggleLiv}
          className="rounded-full border border-[color:var(--color-border-subtle)] px-3 py-1 text-xs text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border-strong)]"
          aria-pressed={minLiv !== null}
        >
          {minLiv === null ? t('similares.filter_liv_on') : t('similares.filter_liv_off')}
        </button>
      </div>

      <ul className="space-y-3">
        {results.map((r) => (
          <li
            key={r.colonia_id}
            className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/${locale}/indices/${indexCode}?scope_id=${encodeURIComponent(r.colonia_id)}`}
                  className="text-base font-semibold text-[color:var(--color-text-primary)] hover:underline"
                >
                  {r.colonia_label ?? r.colonia_id}
                </Link>
                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                  {t('similares.similarity_pct', {
                    pct: Math.round(r.similarity * 100),
                  })}
                </p>
              </div>
            </div>

            {r.top_dmx_indices.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.top_dmx_indices.map((idx) => (
                  <span
                    key={idx.code}
                    className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-bg-muted)] px-2 py-0.5 text-[11px] text-[color:var(--color-text-secondary)]"
                  >
                    {idx.code} · {Math.round(idx.value)}
                  </span>
                ))}
              </div>
            ) : null}

            {r.top_shared_vibe_tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.top_shared_vibe_tags.map((tag) => (
                  <span
                    key={tag.vibe_tag_id}
                    className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-accent-warm-soft,var(--color-bg-muted))] px-2 py-0.5 text-[11px] text-[color:var(--color-text-primary)]"
                  >
                    {t(`vibe_tags.${tag.vibe_tag_id}` as unknown as 'vibe_tags.walkability')}
                    {' · '}
                    {Math.round((tag.weight_self + tag.weight_other) / 2)}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-xs text-[color:var(--color-text-muted)]">
        {t('similares.source_note', { sourceId: sourceColoniaId.slice(0, 8) })}
      </p>
    </section>
  );
}
