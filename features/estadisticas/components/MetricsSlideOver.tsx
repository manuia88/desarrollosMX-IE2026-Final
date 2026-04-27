'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { type KpiKey, tierForValue } from '@/features/estadisticas/lib/thresholds';
import { Button, cn } from '@/shared/ui/primitives/canon';

type KpiValues = {
  readonly pendingInquiries: number;
  readonly firstResponseTime: number | null;
  readonly avgResponseTime: number | null;
  readonly interactionsVolume: number;
  readonly avgSuggestions: number;
  readonly visitRate: number | null;
  readonly offerRate: number | null;
  readonly inventoryActivePct: number | null;
  readonly inventoryTotal: number;
  readonly acmsGenerated: number;
  readonly capturesNew: number;
};

export interface MetricsSlideOverProps {
  readonly kpis: KpiValues;
}

const KPI_ORDER: ReadonlyArray<KpiKey> = [
  'pendingInquiries',
  'firstResponseTime',
  'avgResponseTime',
  'interactionsVolume',
  'avgSuggestions',
  'visitRate',
  'offerRate',
  'inventoryActivePct',
  'inventoryTotal',
  'acmsGenerated',
  'capturesNew',
];

const TIER_COLOR: Record<'green' | 'yellow' | 'red', string> = {
  green: 'rgb(34, 197, 94)',
  yellow: 'rgb(245, 158, 11)',
  red: 'rgb(239, 68, 68)',
};

function formatValue(key: KpiKey, value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  switch (key) {
    case 'firstResponseTime':
    case 'avgResponseTime':
      return `${value.toFixed(0)} min`;
    case 'visitRate':
    case 'offerRate':
    case 'inventoryActivePct':
      return `${value.toFixed(0)}%`;
    case 'avgSuggestions':
      return value.toFixed(1);
    default:
      return value.toFixed(0);
  }
}

export function MetricsSlideOver({ kpis }: MetricsSlideOverProps) {
  const t = useTranslations('estadisticas');
  const router = useRouter();
  const searchParams = useSearchParams();
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const open = searchParams?.get('metrics') === 'true';

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('metrics');
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const rows = useMemo(
    () =>
      KPI_ORDER.map((key) => {
        const value = kpis[key];
        const tier = tierForValue(key, value);
        return {
          key,
          value,
          tier,
          formatted: formatValue(key, value),
        };
      }),
    [kpis],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <button
        type="button"
        aria-label={t('slideOver.close')}
        onClick={close}
        className="absolute inset-0 bg-black/40"
        style={{ cursor: 'default' }}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute top-0 right-0 h-full w-full md:w-[420px]',
          'bg-[color:var(--canon-bg,#0b0b10)]',
          'border-l border-[color:var(--canon-border,rgba(255,255,255,0.10))]',
          'shadow-[var(--shadow-canon-spotlight,0_24px_64px_rgba(0,0,0,0.45))]',
          'flex flex-col',
          'motion-safe:animate-[metricsSlideOverIn_240ms_var(--canon-ease-out,ease-out)_forwards]',
          'opacity-0 -translate-y-2',
        )}
        style={{ animationFillMode: 'forwards' }}
      >
        <style>{`
          @keyframes metricsSlideOverIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-canon-slideover] { animation: none !important; opacity: 1 !important; transform: none !important; }
          }
        `}</style>
        <div data-canon-slideover className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--canon-border,rgba(255,255,255,0.10))]">
            <h2
              id={headingId}
              className="text-[color:var(--canon-cream,#f0ebe0)] text-base font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('slideOver.title')}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              aria-label={t('slideOver.close')}
              onClick={close}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center',
                'rounded-[var(--canon-radius-pill,9999px)]',
                'border border-[color:var(--canon-border,rgba(255,255,255,0.10))]',
                'bg-[color:rgba(255,255,255,0.04)]',
                'text-[color:var(--canon-cream,#f0ebe0)]',
                'hover:bg-[color:rgba(255,255,255,0.08)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo,#6366f1)]',
              )}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="flex flex-col gap-1" data-testid="metrics-slideover-list">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className={cn(
                    'flex items-center justify-between',
                    'py-3 px-2 rounded-md',
                    'border-b border-[color:var(--canon-border,rgba(255,255,255,0.06))]',
                  )}
                  data-kpi-key={row.key}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: TIER_COLOR[row.tier] }}
                    />
                    <span className="text-[13px] text-[color:var(--canon-cream,#f0ebe0)] truncate">
                      {t(`kpi.${row.key}.label`)}
                    </span>
                  </div>
                  <span
                    className="text-[13.5px] font-semibold tabular-nums text-[color:var(--canon-cream,#f0ebe0)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {row.formatted}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-5 py-4 border-t border-[color:var(--canon-border,rgba(255,255,255,0.10))]">
            <Button variant="glass" size="md" onClick={close} className="w-full">
              {t('slideOver.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
