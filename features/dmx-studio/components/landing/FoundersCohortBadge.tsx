'use client';

import { useTranslations } from 'next-intl';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

export interface FoundersCohortBadgeProps {
  readonly foundersRemaining: number;
  readonly foundersTotal: number;
}

function scrollToWaitlist() {
  const el = typeof document !== 'undefined' ? document.getElementById('waitlist') : null;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const PERK_KEYS = ['lifetime', 'earlyAccess', 'badge', 'input'] as const;

export function FoundersCohortBadge({
  foundersRemaining,
  foundersTotal,
}: FoundersCohortBadgeProps) {
  const t = useTranslations('Studio.founders');
  const tPerks = useTranslations('Studio.founders.perks');
  const isFull = foundersRemaining <= 0;

  return (
    <section
      aria-label={t('sectionLabel')}
      className="relative px-6 py-20"
      style={{ background: 'var(--canon-bg-2)' }}
    >
      <div className="mx-auto max-w-5xl">
        <FadeUp>
          <Card variant={isFull ? 'elevated' : 'glow'} className="flex flex-col gap-6 p-8 md:p-10">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <IconCircle
                  tone={isFull ? 'glass' : 'violet'}
                  size="lg"
                  icon={
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Founders</title>
                      <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
                    </svg>
                  }
                />
                <h2
                  className="font-[var(--font-display)] text-2xl font-extrabold tracking-tight md:text-3xl"
                  style={{ color: 'var(--canon-cream)' }}
                >
                  {isFull ? t('badgeFull') : t('badgeAvailable')}
                </h2>
              </div>
              {!isFull ? (
                <div
                  className="flex items-baseline gap-2"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--canon-cream)' }}
                >
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{ color: 'var(--canon-cream-3)' }}
                  >
                    {t('remainingPrefix')}
                  </span>
                  <span
                    className="text-4xl font-extrabold"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {foundersRemaining}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--canon-cream-3)' }}>
                    / {foundersTotal} {t('remainingSuffix')}
                  </span>
                </div>
              ) : null}
            </div>

            <div>
              <h3
                className="mb-3 text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'var(--canon-cream-2)' }}
              >
                {t('perksTitle')}
              </h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {PERK_KEYS.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-3 text-sm"
                    style={{ color: 'var(--canon-cream)' }}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: 'var(--canon-indigo-2)' }}
                    />
                    <span>{tPerks(key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <Button
                variant={isFull ? 'glass' : 'primary'}
                size="lg"
                onClick={scrollToWaitlist}
                aria-label={isFull ? t('ctaWaitlist') : t('ctaJoin')}
              >
                {isFull ? t('ctaWaitlist') : t('ctaJoin')}
              </Button>
              <DisclosurePill tone="violet">{t('disclosureLabel')}</DisclosurePill>
            </div>
          </Card>
        </FadeUp>
      </div>
    </section>
  );
}
