'use client';

// BLOQUE 11.O.3.2 — LifePath results list: top 20 colonias con breakdown
// por componente + cross-link a Genoma (11.M) para "ver similares".

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { LifePathMatch } from '@/features/lifepath/types';
import { trpc } from '@/shared/lib/trpc/client';

interface LifePathResultsListProps {
  readonly locale: string;
}

const COMPONENT_KEYS = [
  'familia',
  'budget',
  'movilidad',
  'amenidades',
  'seguridad',
  'verde',
  'vibe',
] as const;

export function LifePathResultsList({ locale }: LifePathResultsListProps) {
  const t = useTranslations('LifePath.results');
  const query = trpc.lifepath.getMyProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

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
    return (
      <p role="alert" className="text-sm text-[color:var(--color-danger)]">
        {t('load_error')}
      </p>
    );
  }

  const profile = query.data;
  if (!profile) {
    return (
      <div className="space-y-3 rounded-lg border border-[color:var(--color-border)] p-4 text-sm">
        <p>{t('empty_state')}</p>
        <Link
          href={`/${locale}/lifepath/quiz`}
          className="inline-block rounded-md bg-[color:var(--color-accent)] px-4 py-2 font-medium text-[color:var(--color-on-accent)]"
        >
          {t('take_quiz_cta')}
        </Link>
      </div>
    );
  }

  const matches: readonly LifePathMatch[] = profile.matches;

  if (matches.length === 0) {
    return (
      <p className="rounded-lg border border-[color:var(--color-border)] p-4 text-sm text-[color:var(--color-text-secondary)]">
        {t('no_matches')}
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <p className="text-xs text-[color:var(--color-text-secondary)]">
        {t('methodology_line', {
          methodology: profile.methodology,
          version: profile.answers_version,
        })}
      </p>
      <ol className="space-y-3">
        {matches.map((m, idx) => (
          <li
            key={m.colonia_id}
            className="rounded-lg border border-[color:var(--color-border)] p-4"
          >
            <header className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[color:var(--color-text-secondary)]">#{idx + 1}</p>
                <h3 className="text-lg font-semibold">
                  {m.colonia_label ?? m.colonia_id.slice(0, 8)}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-[color:var(--color-text-secondary)]">
                  {t('score_label')}
                </p>
                <p className="text-2xl font-bold text-[color:var(--color-accent)]">
                  {m.score.toFixed(1)}
                </p>
              </div>
            </header>

            <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-7">
              {COMPONENT_KEYS.map((k) => (
                <div key={k} className="text-xs">
                  <dt className="text-[color:var(--color-text-secondary)]">
                    {t(`component_${k}`)}
                  </dt>
                  <dd className="font-semibold">{m.components[k].toFixed(0)}</dd>
                </div>
              ))}
            </dl>

            {m.shared_vibe_tags.length > 0 ? (
              <ul aria-label={t('shared_tags_label')} className="mt-3 flex flex-wrap gap-1.5">
                {m.shared_vibe_tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-[color:var(--color-accent-muted)] px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}

            {m.top_dmx_indices.length > 0 ? (
              <ul
                aria-label={t('dmx_label')}
                className="mt-2 flex flex-wrap gap-1.5 text-xs text-[color:var(--color-text-secondary)]"
              >
                {m.top_dmx_indices.map((d) => (
                  <li key={d.code}>
                    {d.code}: {d.value.toFixed(0)}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/${locale}/indices/similares/${m.colonia_id}`}
                className="text-[color:var(--color-accent)] hover:underline"
              >
                {t('see_similar_cta')}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default LifePathResultsList;
