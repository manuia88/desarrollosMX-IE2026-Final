'use client';

import { useTranslations } from 'next-intl';
import { FadeUp } from '@/shared/ui/motion/fade-up';
import { Card } from '@/shared/ui/primitives/canon/card';

export interface ActivityItem {
  id: string;
  label: string;
  relativeTime: string;
  isNew?: boolean;
}

export interface ActivityFeedProps {
  items: readonly ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const t = useTranslations('AsesorDashboard.activity');

  return (
    <FadeUp delay={0.26} durationMs={600} distance={18}>
      <Card
        variant="elevated"
        className="flex flex-col gap-3 p-6 transition-transform duration-200 hover:-translate-y-1"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <header className="flex items-center justify-between">
          <h2
            className="text-[14px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
          >
            {t('title')}
          </h2>
        </header>
        {items.length === 0 ? (
          <p
            className="text-[13px]"
            style={{ color: 'var(--canon-cream-3)', fontFamily: 'var(--font-body)' }}
          >
            {t('empty')}
          </p>
        ) : (
          <ul className="flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-[10px] px-2 py-1.5">
                <span
                  aria-hidden="true"
                  className="inline-flex h-2 w-2 rounded-full"
                  style={{
                    background: item.isNew ? 'var(--canon-green)' : 'var(--canon-border-3)',
                    boxShadow: item.isNew ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                  }}
                />
                <span
                  className="flex-1 text-[13px]"
                  style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-body)' }}
                >
                  {item.label}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--canon-cream-3)', fontFamily: 'var(--font-body)' }}
                >
                  {item.relativeTime}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </FadeUp>
  );
}
