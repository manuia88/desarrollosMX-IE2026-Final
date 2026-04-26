import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon/card';

export interface XpProgressBarProps {
  level: number;
  current: number;
  next: number;
}

export function XpProgressBar({ level, current, next }: XpProgressBarProps) {
  const t = useTranslations('AsesorDashboard.xp');
  const ratio = next > 0 ? Math.min(1, current / next) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <Card variant="elevated" className="flex flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h2
          className="text-[14px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('title', { level })}
        </h2>
        <span
          className="text-[12px]"
          style={{
            color: 'var(--canon-cream-2)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-body)',
          }}
        >
          {pct}%
        </span>
      </header>
      <div className="h-3 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-3 rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--canon-indigo), var(--canon-rose))',
          }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={next}
          aria-label={t('aria', { current, next })}
        />
      </div>
      <span
        className="text-[11px]"
        style={{
          color: 'var(--canon-cream-3)',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-body)',
        }}
      >
        {t('progress', { current, next })}
      </span>
    </Card>
  );
}
