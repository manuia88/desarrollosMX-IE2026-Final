'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef } from 'react';
import type { KpiKey } from '@/features/estadisticas/lib/thresholds';
import { Button, cn } from '@/shared/ui/primitives/canon';

export interface PedagogyDrawerProps {
  readonly kpiKey: KpiKey | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onAction?: (kpiKey: KpiKey) => void;
}

const TIPS_FALLBACK_COUNT = 3;

export function PedagogyDrawer({ kpiKey, open, onClose, onAction }: PedagogyDrawerProps) {
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

  if (!open || !kpiKey) return null;

  const tips: ReadonlyArray<string> = (() => {
    const items: string[] = [];
    for (let i = 1; i <= TIPS_FALLBACK_COUNT; i++) {
      const key = `pedagogy.${kpiKey}.tips.items.${i}`;
      items.push(t(key));
    }
    return items;
  })();

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <button
        type="button"
        aria-label={t('pedagogy.close')}
        onClick={handleClose}
        className="absolute inset-0 bg-black/40"
        style={{ cursor: 'default' }}
        tabIndex={-1}
      />
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-full md:w-[360px]',
          'bg-[color:var(--canon-bg,#0b0b10)]',
          'border-l border-[color:var(--canon-border,rgba(255,255,255,0.10))]',
          'shadow-[var(--shadow-canon-spotlight,0_24px_64px_rgba(0,0,0,0.45))]',
          'flex flex-col',
        )}
      >
        <style>{`
          @keyframes pedagogyDrawerIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          [data-canon-pedagogy] { animation: pedagogyDrawerIn 220ms var(--canon-ease-out, ease-out) forwards; }
          @media (prefers-reduced-motion: reduce) {
            [data-canon-pedagogy] { animation: none !important; opacity: 1 !important; transform: none !important; }
          }
        `}</style>
        <div data-canon-pedagogy className="flex h-full flex-col" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--canon-border,rgba(255,255,255,0.10))]">
            <h2
              id={headingId}
              className="text-[color:var(--canon-cream,#f0ebe0)] text-base font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t(`kpi.${kpiKey}.label`)}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              aria-label={t('pedagogy.close')}
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
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
            <section>
              <h3
                className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--canon-indigo-2,#a5b4fc)] mb-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t(`pedagogy.${kpiKey}.whatMeasures.title`)}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-[color:var(--canon-cream,#f0ebe0)]">
                {t(`pedagogy.${kpiKey}.whatMeasures.body`)}
              </p>
            </section>
            <section>
              <h3
                className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--canon-indigo-2,#a5b4fc)] mb-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t(`pedagogy.${kpiKey}.whyMatters.title`)}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-[color:var(--canon-cream,#f0ebe0)]">
                {t(`pedagogy.${kpiKey}.whyMatters.body`)}
              </p>
            </section>
            <section>
              <h3
                className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--canon-indigo-2,#a5b4fc)] mb-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t(`pedagogy.${kpiKey}.tips.title`)}
              </h3>
              <ul className="flex flex-col gap-1.5 text-[13.5px] leading-relaxed text-[color:var(--canon-cream,#f0ebe0)]">
                {tips.map((tip) => (
                  <li key={`${kpiKey}-tip-${tip}`} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 rounded-full shrink-0"
                      style={{ backgroundColor: 'var(--canon-indigo-2, #a5b4fc)' }}
                    />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3
                className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--canon-indigo-2,#a5b4fc)] mb-1.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t(`pedagogy.${kpiKey}.howEvolves.title`)}
              </h3>
              <div className="h-24 rounded-md bg-[color:var(--surface-recessed,#f3f4f6)] flex items-center justify-center text-xs text-[color:var(--color-text-muted,#9ca3af)]">
                {t('pedagogy.miniChartComingSoon')}
              </div>
            </section>
          </div>
          <div className="px-5 py-4 border-t border-[color:var(--canon-border,rgba(255,255,255,0.10))]">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => onAction?.(kpiKey)}
              disabled={!onAction}
            >
              {t('pedagogy.recommendedAction')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
