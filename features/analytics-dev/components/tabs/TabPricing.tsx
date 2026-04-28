'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { cn } from '@/shared/ui/primitives/cn';
import { DisclosureBadge } from '../DisclosureBadge';

interface Props {
  readonly proyectoId: string;
}

const FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export function TabPricing({ proyectoId }: Props) {
  const t = useTranslations('dev.analytics.pricing');
  const utils = trpc.useUtils();
  const autopilotQ = trpc.analyticsDev.getPricingAutopilot.useQuery(
    { proyectoId },
    { retry: false },
  );
  const dynamicQ = trpc.analyticsDev.listDynamicPricing.useQuery(
    { proyectoId, unappliedOnly: true },
    { retry: false },
  );
  const applyMut = trpc.analyticsDev.applyPricingSuggestion.useMutation({
    onSuccess: () => {
      utils.analyticsDev.getPricingAutopilot.invalidate({ proyectoId });
      utils.analyticsDev.listDynamicPricing.invalidate({ proyectoId });
    },
  });
  const [filterDeviation, setFilterDeviation] = useState(false);
  const [autoApply, setAutoApply] = useState(false);

  const visible = useMemo(() => {
    const rows = autopilotQ.data?.suggestions ?? [];
    return filterDeviation ? rows.filter((r) => Math.abs(r.delta_pct) >= 5) : rows;
  }, [autopilotQ.data, filterDeviation]);

  if (autopilotQ.isLoading)
    return <p className="text-sm text-[color:var(--color-text-secondary)]">{t('loading')}</p>;
  if (autopilotQ.error) return <Card className="p-4">{autopilotQ.error.message}</Card>;
  if (!autopilotQ.data) return null;

  const summary = autopilotQ.data.summary;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{t('title')}</h2>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              {t('summary', {
                total: summary.total,
                bajadas: summary.bajadas,
                subidas: summary.subidas,
                hold: summary.hold,
                deltaAvg: summary.delta_avg_pct.toFixed(2),
              })}
            </p>
          </div>
          <DisclosureBadge disclosure={autopilotQ.data.disclosure} />
        </header>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterDeviation}
              onChange={(e) => setFilterDeviation(e.target.checked)}
            />
            <span>{t('filterDeviation')}</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
            />
            <span>
              {t('autoApply')}
              <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-900">
                {t('autoApplyTier')}
              </span>
            </span>
          </label>
          <p className="text-xs text-[color:var(--color-text-tertiary)]">{t('autoApplyHint')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                <th className="px-2 py-1.5">{t('cols.unit')}</th>
                <th className="px-2 py-1.5">{t('cols.tipo')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.current')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.suggested')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.delta')}</th>
                <th className="px-2 py-1.5 text-right">{t('cols.dom')}</th>
                <th className="px-2 py-1.5">{t('cols.action')}</th>
                <th className="px-2 py-1.5">{t('cols.reasoning')}</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.unidadId} className="border-t border-[color:var(--color-border-subtle)]">
                  <td className="px-2 py-1.5 font-medium">{s.unidadNumero}</td>
                  <td className="px-2 py-1.5 text-xs text-[color:var(--color-text-secondary)]">
                    {s.tipo}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {FORMATTER.format(s.precio_actual)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {FORMATTER.format(s.precio_sugerido)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1.5 text-right font-semibold tabular-nums',
                      s.delta_pct < 0
                        ? 'text-rose-700'
                        : s.delta_pct > 0
                          ? 'text-emerald-700'
                          : 'text-[color:var(--color-text-secondary)]',
                    )}
                  >
                    {s.delta_pct.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{s.diasMercado}</td>
                  <td className="px-2 py-1.5 text-xs">{t(`actions.${s.accion}`)}</td>
                  <td className="px-2 py-1.5 text-xs text-[color:var(--color-text-secondary)]">
                    {s.rationale}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {s.accion !== 'mantener' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        type="button"
                        disabled={applyMut.isPending}
                        onClick={() =>
                          applyMut.mutate({
                            unidadId: s.unidadId,
                            suggestedPriceMxn: s.precio_sugerido,
                          })
                        }
                      >
                        {t('apply')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-2 py-4 text-center text-xs text-[color:var(--color-text-secondary)]"
                  >
                    {t('emptySuggestions')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="space-y-2 p-4">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('dailyTitle')}</h3>
          <span className="text-xs text-[color:var(--color-text-secondary)]">{t('dailyHint')}</span>
        </header>
        {dynamicQ.data && dynamicQ.data.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {dynamicQ.data.slice(0, 8).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] p-2"
              >
                <span className="font-medium">{row.unidadNumero}</span>
                <span className="text-xs text-[color:var(--color-text-secondary)]">
                  {FORMATTER.format(row.current_price_mxn)} →{' '}
                  {FORMATTER.format(row.suggested_price_mxn)} ({Number(row.delta_pct).toFixed(2)}%)
                </span>
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-900">
                  {row.confidence ?? 'medium'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[color:var(--color-text-secondary)]">{t('dailyEmpty')}</p>
        )}
      </Card>
    </div>
  );
}
