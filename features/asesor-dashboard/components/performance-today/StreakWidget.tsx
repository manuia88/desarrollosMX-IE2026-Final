'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useRef } from 'react';
import { IconFlame } from '@/shared/ui/icons/canon-icons';
import { FadeUp } from '@/shared/ui/motion/fade-up';
import { useInView } from '@/shared/ui/motion/use-in-view';
import { Card } from '@/shared/ui/primitives/canon/card';

export interface StreakWidgetProps {
  days: number;
  bars: readonly number[];
}

const BAR_TRANSITION = 'transform 900ms cubic-bezier(0.4, 0, 0.2, 1)';

function StreakBars({ bars, ariaLabel }: { bars: readonly number[]; ariaLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const max = Math.max(...bars, 1);

  return (
    <div
      ref={ref}
      className="flex items-end gap-[3px]"
      style={{ height: 36 }}
      role="img"
      aria-label={ariaLabel}
    >
      {bars.map((value, i) => {
        const h = Math.max(2, (value / max) * 32);
        const style: CSSProperties = {
          flex: 1,
          height: h,
          transformOrigin: 'bottom',
          transform: inView ? 'scaleY(1)' : 'scaleY(0)',
          transition: BAR_TRANSITION,
          transitionDelay: `${i * 18}ms`,
          background:
            value > 0
              ? 'linear-gradient(180deg, var(--canon-indigo), var(--accent-teal))'
              : 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--canon-radius-sharp)',
        };
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: 30-day fixed timeline, positional ordering
          <div key={i} style={style} />
        );
      })}
    </div>
  );
}

export function StreakWidget({ days, bars }: StreakWidgetProps) {
  const t = useTranslations('AsesorDashboard.streak');

  return (
    <FadeUp delay={0.05} durationMs={600} distance={16}>
      <Card variant="elevated" className="flex flex-col gap-4 p-6">
        <header className="flex items-center justify-between">
          <h2
            className="text-[14px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--canon-white-pure)', fontFamily: 'var(--font-body)' }}
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
        <StreakBars bars={bars} ariaLabel={t('chartAria', { count: bars.length })} />
        <span
          className="text-[11px]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('subtitle')}
        </span>
      </Card>
    </FadeUp>
  );
}
