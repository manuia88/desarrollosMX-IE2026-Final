'use client';

import { useTranslations } from 'next-intl';
import { AnimatedBar } from '@/shared/ui/motion/animated-bar';
import { CountUp } from '@/shared/ui/motion/count-up';
import { FadeUp } from '@/shared/ui/motion/fade-up';
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
    <FadeUp delay={0.12} durationMs={600} distance={16}>
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
            <CountUp to={pct} durationMs={1400} suffix="%" />
          </span>
        </header>
        <AnimatedBar
          value={pct}
          max={100}
          height={12}
          fillBackground="linear-gradient(90deg, var(--canon-indigo), var(--canon-rose))"
          glowColor="rgba(99,102,241,0.45)"
          ariaLabel={t('aria', { current, next })}
        />
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
    </FadeUp>
  );
}
