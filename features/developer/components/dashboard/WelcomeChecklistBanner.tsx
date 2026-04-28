'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

export type WelcomeChecklistBannerProps = {
  readonly steps: ReadonlyArray<{ key: string; done: boolean }>;
  readonly onDismiss?: () => void;
};

export function WelcomeChecklistBanner({ steps, onDismiss }: WelcomeChecklistBannerProps) {
  const t = useTranslations('dev.dashboard.welcomeChecklist');
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (completed === total) return null;

  return (
    <Card className="relative flex flex-col gap-4 overflow-hidden p-6">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: 'linear-gradient(90deg, #6366F1, #EC4899)',
          width: `${pct}%`,
        }}
        aria-hidden="true"
      />
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            {t('eyebrow')}
          </span>
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {t('title', { completed, total })}
          </h2>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('dismiss')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--canon-cream-2)',
            }}
          >
            ×
          </button>
        ) : null}
      </header>

      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li
            key={step.key}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
            style={{
              background: step.done ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              color: step.done ? 'var(--canon-cream-2)' : 'var(--canon-cream)',
            }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                background: step.done ? '#34d399' : 'rgba(255,255,255,0.06)',
                color: step.done ? '#0f172a' : 'var(--canon-cream-3)',
              }}
              aria-hidden="true"
            >
              {step.done ? '✓' : ''}
            </span>
            <span className={step.done ? 'line-through' : ''}>{t(`steps.${step.key}`)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
