'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, ScorePill, tierFromScore } from '@/shared/ui/primitives/canon';
import { Input } from '@/shared/ui/primitives/input';

export function ManzanaPicker() {
  const t = useTranslations('dev.upg.manzana');
  const [coloniaId, setColoniaId] = useState<string>('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  const analysisQ = trpc.developerUpg.getManzanaAnalysis.useQuery(
    submitted ? { coloniaId: submitted } : { coloniaId: '' },
    { enabled: Boolean(submitted) },
  );

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
      </header>

      <Card variant="elevated" className="space-y-4 p-5">
        <p className="text-sm text-[color:var(--color-text-secondary)]">{t('pickerHint')}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (coloniaId.trim().length > 0) setSubmitted(coloniaId.trim());
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label htmlFor="manzana-colonia-id" className="flex-1 space-y-1 text-sm">
            <span className="font-medium">{t('coloniaIdLabel')}</span>
            <Input
              id="manzana-colonia-id"
              type="text"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={coloniaId}
              onChange={(e) => setColoniaId(e.target.value)}
              required
            />
          </label>
          <Button type="submit" variant="primary">
            {t('analyzeCta')}
          </Button>
        </form>
      </Card>

      {submitted ? (
        analysisQ.isLoading ? (
          <Card variant="recessed" className="p-6 text-sm" aria-busy="true">
            {t('loading')}
          </Card>
        ) : analysisQ.data ? (
          <Card variant="elevated" className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('resultTitle')}</h2>
              <ScorePill tier={tierFromScore(analysisQ.data.scoreTotal)}>
                {analysisQ.data.scoreTotal}
              </ScorePill>
            </div>
            <p className="text-sm text-[color:var(--color-text-secondary)]">
              {analysisQ.data.recommendation}
            </p>
            <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {(Object.entries(analysisQ.data.breakdown) as Array<[string, number | null]>).map(
                ([k, v]) => (
                  <li
                    key={k}
                    className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] p-3"
                  >
                    <span className="text-xs uppercase text-[color:var(--color-text-tertiary)]">
                      {t(`breakdown.${k}`)}
                    </span>
                    <p className="font-mono text-base tabular-nums">
                      {v !== null ? v.toFixed(0) : '—'}
                    </p>
                  </li>
                ),
              )}
            </ul>
            {analysisQ.data.missing.length > 0 ? (
              <p className="text-xs text-[color:var(--color-text-tertiary)]">
                {t('missingLabel')}: {analysisQ.data.missing.join(', ')}
              </p>
            ) : null}
            <p className="text-xs text-[color:var(--color-text-tertiary)]">
              disclosure: {analysisQ.data.disclosure}
            </p>
          </Card>
        ) : (
          <Card variant="recessed" className="p-6 text-sm">
            {t('noData')}
          </Card>
        )
      ) : null}
    </section>
  );
}
