'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { ForwardCurve } from '../types';
import { ForwardCurveChart } from './ForwardCurveChart';

export interface FuturesCurveClientProps {
  readonly curves: ReadonlyArray<ForwardCurve>;
  readonly indexCode: string;
  readonly locale: string;
  readonly scopeIds: readonly string[];
}

function buildCsv(curves: ReadonlyArray<ForwardCurve>): string {
  const header = [
    'index_code',
    'scope_id',
    'base_period_date',
    'horizon_m',
    'value',
    'lower',
    'upper',
    'confidence',
    'methodology',
  ].join(',');
  const rows = curves.flatMap((c) =>
    c.points.map((p) =>
      [
        c.index_code,
        c.scope_id,
        c.base_period_date,
        p.horizon_m.toString(),
        p.value?.toString() ?? '',
        p.lower?.toString() ?? '',
        p.upper?.toString() ?? '',
        p.confidence?.toString() ?? '',
        c.methodology,
      ].join(','),
    ),
  );
  return [header, ...rows].join('\n');
}

export function FuturesCurveClient({
  curves,
  indexCode,
  locale,
  scopeIds,
}: FuturesCurveClientProps) {
  const t = useTranslations('FuturesCurve');
  void locale;

  const onExportCsv = useCallback(() => {
    if (typeof window === 'undefined' || curves.length === 0) return;
    const csv = buildCsv(curves);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `forward_curve_${indexCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [curves, indexCode]);

  if (scopeIds.length === 0) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-sm text-[color:var(--color-text-secondary)]"
      >
        {t('pick_scopes_hint')}
      </div>
    );
  }

  if (curves.length === 0) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-sm text-[color:var(--color-text-secondary)]"
      >
        {t('empty')}
      </div>
    );
  }

  return (
    <section aria-labelledby="forward-curve-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="forward-curve-heading"
          className="text-lg font-semibold text-[color:var(--color-text-primary)]"
        >
          {t('chart_heading', { count: curves.length })}
        </h2>
        <button
          type="button"
          onClick={onExportCsv}
          className="rounded-full border border-[color:var(--color-border-subtle)] px-3 py-1 text-xs text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border-strong)]"
        >
          {t('export_csv')}
        </button>
      </div>

      <ForwardCurveChart
        curves={curves}
        height={360}
        ariaLabel={t('chart_a11y', { code: indexCode })}
      />

      <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[3, 6, 12, 24].map((horizon) => {
          const first = curves[0];
          if (!first) return null;
          const point = first.points.find((p) => p.horizon_m === horizon);
          if (!point) return null;
          return (
            <div
              key={horizon}
              className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-3"
            >
              <dt className="text-xs text-[color:var(--color-text-secondary)]">
                {t('horizon_label', { months: horizon })}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[color:var(--color-text-primary)]">
                {point.value?.toFixed(1) ?? '—'}
              </dd>
              <dd className="text-xs text-[color:var(--color-text-muted)]">
                {point.lower !== null && point.upper !== null
                  ? t('ci_range', {
                      lower: point.lower.toFixed(1),
                      upper: point.upper.toFixed(1),
                    })
                  : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
