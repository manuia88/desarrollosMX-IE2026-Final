'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, ScorePill, tierFromScore } from '@/shared/ui/primitives/canon';
import { Input } from '@/shared/ui/primitives/input';

interface BenchmarkDashboardProps {
  readonly desarrolladoraId: string;
}

function defaultQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function BenchmarkDashboard({ desarrolladoraId }: BenchmarkDashboardProps) {
  const t = useTranslations('dev.upg.benchmark');
  const [quarter, setQuarter] = useState<string>(defaultQuarter());

  const benchQ = trpc.developerUpg.getBenchmark.useQuery({
    desarrolladoraId,
    periodQuarter: quarter,
    countryCode: 'MX',
  });

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('subtitle')}</p>
        </div>
        <label htmlFor="benchmark-quarter" className="flex items-center gap-2 text-sm">
          <span className="font-medium">{t('quarterLabel')}</span>
          <Input
            id="benchmark-quarter"
            type="text"
            pattern="\d{4}-Q[1-4]"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="w-32"
          />
        </label>
      </header>

      {benchQ.isLoading ? (
        <Card variant="recessed" className="p-6 text-sm" aria-busy="true">
          {t('loading')}
        </Card>
      ) : benchQ.error ? (
        <Card variant="recessed" className="p-6 text-sm text-red-600">
          {benchQ.error.message}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {benchQ.data?.metrics.map((m) => (
            <Card key={m.metric} variant="elevated" className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t(`metrics.${m.metric}`)}</h2>
                <ScorePill tier={tierFromScore(m.percentile)}>P{m.percentile}</ScorePill>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs uppercase text-[color:var(--color-text-tertiary)]">
                    {t('valueLabel')}
                  </span>
                  <p className="font-mono text-lg tabular-nums">{m.value.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs uppercase text-[color:var(--color-text-tertiary)]">
                    {t('cohortMedianLabel')}
                  </span>
                  <p className="font-mono text-lg tabular-nums">
                    {m.cohortMedian.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase text-[color:var(--color-text-tertiary)]">
                    {t('topPctLabel', { pct: 25 })}
                  </span>
                  <p className="font-mono text-base tabular-nums">
                    {m.cohortTop25.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase text-[color:var(--color-text-tertiary)]">
                    {t('topPctLabel', { pct: 10 })}
                  </span>
                  <p className="font-mono text-base tabular-nums">
                    {m.cohortTop10.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[color:var(--color-text-tertiary)]">
                {t('cohortSizeLabel', { count: m.cohortSize })} · {m.disclosure}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
