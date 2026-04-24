'use client';

// BLOQUE 11.R.3.5 (U7) — path finder widget.
// Input 2 UUIDs (source + target), trigger findPath mutation, render
// lista de nodos + highlight visual en graph.

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { PathResult } from '@/features/constellations/types';
import { trpc } from '@/shared/lib/trpc/client';

interface PathFinderWidgetProps {
  readonly defaultSource?: string;
}

export function PathFinderWidget({ defaultSource = '' }: PathFinderWidgetProps) {
  const t = useTranslations('Constellations.path_finder');
  const [source, setSource] = useState(defaultSource);
  const [target, setTarget] = useState('');
  const [result, setResult] = useState<PathResult | null>(null);

  const mutation = trpc.constellations.findPath.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
  });

  function isUuid(v: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      v,
    );
  }

  const canSearch = isUuid(source) && isUuid(target) && source !== target;

  return (
    <section className="space-y-3 rounded-lg border border-[color:var(--color-border)] p-4">
      <header>
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        <p className="mt-1 text-xs text-[color:var(--color-text-secondary)]">{t('help')}</p>
      </header>
      <div className="grid gap-2">
        <label className="space-y-1 text-xs">
          <span>{t('source_label')}</span>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={t('source_placeholder')}
            className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-xs"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>{t('target_label')}</span>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={t('target_placeholder')}
            className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-xs"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={!canSearch || mutation.isPending}
        onClick={() => {
          if (!canSearch) return;
          mutation.mutate({
            sourceColoniaId: source,
            targetColoniaId: target,
            maxHops: 5,
            countryCode: 'MX',
          });
        }}
        className="inline-flex rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-xs font-medium text-[color:var(--color-on-accent)] disabled:opacity-40"
      >
        {mutation.isPending ? t('loading') : t('search_cta')}
      </button>

      {mutation.isError ? (
        <p role="alert" className="text-xs text-[color:var(--color-danger)]">
          {t('error')}
        </p>
      ) : null}

      {result ? (
        <div className="mt-2 space-y-2 rounded-md border border-[color:var(--color-border)] p-3 text-xs">
          {result.found ? (
            <>
              <p>
                {t('result_found', {
                  hops: result.hops,
                  weight: result.total_weight.toFixed(1),
                })}
              </p>
              <ol className="mt-1 space-y-0.5">
                {result.nodes.map((n, idx) => (
                  <li key={n.zone_id} className="flex items-center gap-2">
                    <span className="text-[color:var(--color-text-secondary)]">#{idx + 1}</span>
                    <span className="font-medium">{n.zone_label ?? t('unlabeled_zone')}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-[color:var(--color-text-secondary)]">{t('result_not_found')}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default PathFinderWidget;
