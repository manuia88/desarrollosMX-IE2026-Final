'use client';

import { useTranslations } from 'next-intl';
import { IconAward } from '@/shared/ui/icons/canon-icons';
import { StaggerContainer } from '@/shared/ui/motion/stagger-container';
import { Card } from '@/shared/ui/primitives/canon/card';
import { IconCircle } from '@/shared/ui/primitives/canon/icon-circle';

export interface BadgeItem {
  id: string;
  label: string;
  unlocked: boolean;
  isNew?: boolean;
  tone: 'indigo' | 'teal' | 'gold' | 'violet' | 'rose';
}

export interface BadgesRowProps {
  badges: readonly BadgeItem[];
}

export function BadgesRow({ badges }: BadgesRowProps) {
  const t = useTranslations('AsesorDashboard.badges');

  return (
    <Card variant="elevated" className="flex flex-col gap-4 p-6">
      <header>
        <h2
          className="text-[14px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-white-pure)', fontFamily: 'var(--font-body)' }}
        >
          {t('title')}
        </h2>
      </header>
      {badges.length === 0 ? (
        <p
          className="text-[13px]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('empty')}
        </p>
      ) : (
        <StaggerContainer
          className="grid grid-cols-3 gap-3 sm:grid-cols-6"
          staggerMs={60}
          distance={12}
        >
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="relative flex flex-col items-center gap-1.5"
              title={badge.label}
            >
              <IconCircle
                size="lg"
                tone={badge.unlocked ? badge.tone : 'glass'}
                icon={<IconAward size={20} />}
                aria-label={badge.label}
              />
              {badge.isNew ? (
                <span
                  role="status"
                  aria-label={t('newAria')}
                  className="absolute -right-1 -top-1 inline-flex h-4 min-w-[26px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold uppercase text-white"
                  style={{
                    background: 'var(--canon-rose)',
                    fontFamily: 'var(--font-display)',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }}
                >
                  {t('newBadge')}
                </span>
              ) : null}
              <span
                className="text-center text-[10.5px]"
                style={{
                  color: badge.unlocked ? 'var(--canon-cream-2)' : 'var(--canon-cream-3)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {badge.label}
              </span>
            </div>
          ))}
        </StaggerContainer>
      )}
    </Card>
  );
}
