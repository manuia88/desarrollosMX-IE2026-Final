// BLOQUE 11.P.3.2 — Panel server component: lista twins + chart histórico.

import { getTranslations } from 'next-intl/server';
import type { ClimateTwinResult } from '@/features/climate-twin/types';
import type { ClimateChartPoint } from './ClimateComparisonChart';
import { ClimateComparisonChart } from './ClimateComparisonChart';

interface ClimateTwinPanelProps {
  readonly locale: string;
  readonly zoneLabel: string | null;
  readonly twins: readonly ClimateTwinResult[];
  readonly history: readonly ClimateChartPoint[];
  readonly methodology: string;
}

export async function ClimateTwinPanel({
  locale,
  zoneLabel,
  twins,
  history,
  methodology,
}: ClimateTwinPanelProps) {
  const t = await getTranslations({ locale, namespace: 'ClimateTwin.page' });
  const tFeat = await getTranslations({ locale, namespace: 'ClimateTwin.features' });

  function translateFeature(key: string): string {
    try {
      return tFeat(key);
    } catch {
      return key;
    }
  }

  if (history.length === 0) {
    return (
      <section className="rounded-lg border border-[color:var(--color-border)] p-6 text-sm text-[color:var(--color-text-secondary)]">
        <p>{t('empty_state')}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">
          {zoneLabel ? `${t('chart_title')} — ${zoneLabel}` : t('chart_title')}
        </h2>
        <p className="text-xs text-[color:var(--color-text-secondary)]">
          {t('methodology_line', { methodology })}
        </p>
      </header>

      <ClimateComparisonChart
        series={history}
        tempLabel={t('chart_temp_avg')}
        rainfallLabel={t('chart_rainfall_mm')}
        ariaLabel={t('chart_title')}
      />

      <section className="space-y-2">
        <h3 className="text-base font-semibold">{t('twin_list_title')}</h3>
        {twins.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t('empty_state')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {twins.map((tw) => (
              <li
                key={tw.twin_zone_id}
                className="rounded-lg border border-[color:var(--color-border)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{tw.twin_label ?? t('unlabeled_zone')}</p>
                  <span className="text-sm font-semibold text-[color:var(--color-accent)]">
                    {t('twin_card_similarity', { value: tw.similarity.toFixed(1) })}
                  </span>
                </div>
                {Object.keys(tw.shared_patterns).length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5 text-xs text-[color:var(--color-text-secondary)]">
                    {Object.entries(tw.shared_patterns)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <li
                          key={k}
                          className="rounded-full bg-[color:var(--color-accent-muted)] px-2 py-0.5"
                        >
                          {translateFeature(k)}: {Math.round(v * 100)}%
                        </li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default ClimateTwinPanel;
