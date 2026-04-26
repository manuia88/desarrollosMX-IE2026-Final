import { useTranslations } from 'next-intl';
import { IconFlame } from '@/shared/ui/icons/canon-icons';
import { Card } from '@/shared/ui/primitives/canon/card';

export interface StreakWidgetProps {
  days: number;
  bars: readonly number[];
}

export function StreakWidget({ days, bars }: StreakWidgetProps) {
  const t = useTranslations('AsesorDashboard.streak');
  const max = Math.max(...bars, 1);

  return (
    <Card variant="elevated" className="flex flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h2
          className="text-[14px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('title')}
        </h2>
        <span
          className="inline-flex items-center gap-1 text-[14px] font-bold"
          style={{
            color: 'var(--canon-amber)',
            fontFamily: 'var(--font-display)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <IconFlame size={16} />
          {t('days', { count: days })}
        </span>
      </header>
      <div
        className="flex items-end gap-[3px]"
        style={{ height: 36 }}
        aria-label={t('chartAria', { count: bars.length })}
        role="img"
      >
        {bars.map((value, i) => {
          const h = Math.max(2, (value / max) * 32);
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 30-day fixed timeline, positional ordering
              key={i}
              style={{
                flex: 1,
                height: h,
                background:
                  value > 0
                    ? 'linear-gradient(180deg, var(--canon-indigo), var(--accent-teal))'
                    : 'rgba(255,255,255,0.06)',
                borderRadius: 'var(--canon-radius-sharp)',
              }}
            />
          );
        })}
      </div>
      <span
        className="text-[11px]"
        style={{ color: 'var(--canon-cream-3)', fontFamily: 'var(--font-body)' }}
      >
        {t('subtitle')}
      </span>
    </Card>
  );
}
