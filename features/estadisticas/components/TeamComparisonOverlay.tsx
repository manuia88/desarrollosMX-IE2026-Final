'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef } from 'react';
import { Button, cn } from '@/shared/ui/primitives/canon';

type TeamMetrics = {
  readonly revenue_mxn: number;
  readonly operaciones_cerradas: number;
  readonly visitas_completadas: number;
};

type TopAnonymous = TeamMetrics & {
  readonly label: string;
};

export interface TeamComparisonOverlayProps {
  readonly self: TeamMetrics;
  readonly teamAvg: TeamMetrics;
  readonly topAnonymous: TopAnonymous;
  readonly teamSize: number;
  readonly open: boolean;
  readonly onClose: () => void;
}

type MetricKey = 'revenue_mxn' | 'operaciones_cerradas' | 'visitas_completadas';

const METRIC_KEYS: ReadonlyArray<MetricKey> = [
  'revenue_mxn',
  'operaciones_cerradas',
  'visitas_completadas',
];

function formatMetric(key: MetricKey, value: number): string {
  if (key === 'revenue_mxn') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString('es-MX');
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  const p = (value / max) * 100;
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

export function TeamComparisonOverlay({
  self,
  teamAvg,
  topAnonymous,
  teamSize,
  open,
  onClose,
}: TeamComparisonOverlayProps) {
  const t = useTranslations('estadisticas');
  const headingId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <button
        type="button"
        aria-label={t('team.close')}
        onClick={handleClose}
        className="absolute inset-0 bg-black/40"
        style={{ cursor: 'default' }}
        tabIndex={-1}
      />
      <div
        className={cn(
          'relative w-full max-w-3xl mx-4',
          'bg-[color:var(--canon-bg,#0b0b10)]',
          'border border-[color:var(--canon-border,rgba(255,255,255,0.10))]',
          'rounded-[var(--canon-radius-card,16px)]',
          'shadow-[var(--shadow-canon-spotlight,0_24px_64px_rgba(0,0,0,0.45))]',
          'flex flex-col',
        )}
      >
        <style>{`
          @keyframes teamComparisonIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          [data-canon-team-overlay] { animation: teamComparisonIn 240ms var(--canon-ease-out, ease-out) forwards; }
          @media (prefers-reduced-motion: reduce) {
            [data-canon-team-overlay] { animation: none !important; opacity: 1 !important; transform: none !important; }
          }
        `}</style>
        <div data-canon-team-overlay className="flex flex-col" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--canon-border,rgba(255,255,255,0.10))]">
            <div className="flex flex-col">
              <h2
                id={headingId}
                className="text-[color:var(--canon-cream,#f0ebe0)] text-base font-semibold"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('team.title')}
              </h2>
              <span className="text-xs text-[color:var(--color-text-muted,#9ca3af)]">
                {t('team.teamSize', { count: teamSize })}
              </span>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              aria-label={t('team.close')}
              onClick={handleClose}
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
          <div className="px-6 py-5 flex flex-col gap-6" data-testid="team-comparison-sections">
            {METRIC_KEYS.map((key) => {
              const selfVal = self[key];
              const teamVal = teamAvg[key];
              const topVal = topAnonymous[key];
              const max = Math.max(selfVal, teamVal, topVal, 0);
              const rows = [
                {
                  id: 'self',
                  label: t('team.you'),
                  value: selfVal,
                  color: 'var(--accent-teal, #14b8a6)',
                },
                {
                  id: 'team',
                  label: t('team.average'),
                  value: teamVal,
                  color: 'var(--accent-violet, #8b5cf6)',
                },
                {
                  id: 'top',
                  label: topAnonymous.label,
                  value: topVal,
                  color: 'var(--accent-gold, #f59e0b)',
                },
              ] as const;
              return (
                <section key={key} data-metric-key={key} className="flex flex-col gap-2">
                  <h3
                    className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--canon-indigo-2,#a5b4fc)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {t(`team.metric.${key}`)}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {rows.map((row) => {
                      const widthPct = pct(row.value, max);
                      return (
                        <li key={row.id} className="flex items-center gap-3">
                          <div className="w-24 shrink-0 text-[12.5px] text-[color:var(--canon-cream,#f0ebe0)] truncate">
                            {row.label}
                          </div>
                          <div className="flex-1 h-3 rounded-full bg-[color:rgba(255,255,255,0.06)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 ease-out"
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: row.color,
                              }}
                              aria-hidden="true"
                            />
                          </div>
                          <div
                            className="w-32 shrink-0 text-right text-[12.5px] tabular-nums font-semibold text-[color:var(--canon-cream,#f0ebe0)]"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {formatMetric(key, row.value)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
          <div className="px-6 py-4 border-t border-[color:var(--canon-border,rgba(255,255,255,0.10))] flex justify-end">
            <Button variant="glass" size="md" onClick={handleClose}>
              {t('team.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
