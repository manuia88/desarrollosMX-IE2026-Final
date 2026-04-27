'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { CountUp, FadeUp, StaggerContainer } from '@/shared/ui/motion';
import { Card, DisclosurePill, IconCircle } from '@/shared/ui/primitives/canon';

export interface TrustSignalsProps {
  readonly waitlistCount: number;
  readonly asesoresCount: number;
  readonly foundersRemaining: number;
}

const NUMBER_STYLE: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 'var(--leading-tight)',
};

function PreviewMockup({
  title,
  caption,
  iconPath,
}: {
  readonly title: string;
  readonly caption: string;
  readonly iconPath: string;
}) {
  return (
    <Card variant="elevated" className="flex flex-col gap-3 p-5">
      <div
        aria-hidden="true"
        className="relative flex h-32 w-full items-center justify-center overflow-hidden"
        style={{
          borderRadius: 'var(--canon-radius-inner)',
          background: 'var(--surface-spotlight)',
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--canon-indigo-2)' }}
        >
          <title>{title}</title>
          <path d={iconPath} />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </span>
        <span className="text-xs" style={{ color: 'var(--canon-cream-2)' }}>
          {caption}
        </span>
      </div>
    </Card>
  );
}

export function TrustSignals({
  waitlistCount,
  asesoresCount,
  foundersRemaining,
}: TrustSignalsProps) {
  const t = useTranslations('Studio.trustSignals');

  return (
    <section
      aria-label={t('sectionLabel')}
      className="relative px-6 py-20"
      style={{ background: 'var(--canon-bg)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <FadeUp>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2
              className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ color: 'var(--canon-cream)' }}
            >
              {t('title')}
            </h2>
            <p className="max-w-2xl text-sm" style={{ color: 'var(--canon-cream-2)' }}>
              {t('subtitle')}
            </p>
          </div>
        </FadeUp>

        <StaggerContainer className="grid gap-4 md:grid-cols-3">
          <Card variant="elevated" className="flex flex-col gap-2 p-6 text-center">
            <IconCircle
              tone="indigo"
              size="md"
              className="mx-auto"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Waitlist</title>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <CountUp
              to={waitlistCount}
              durationMs={1600}
              className="text-5xl"
              style={{ ...NUMBER_STYLE, color: 'var(--canon-cream)' }}
            />
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              {t('waitlistLabel')}
            </span>
          </Card>

          <Card variant="elevated" className="flex flex-col gap-2 p-6 text-center">
            <IconCircle
              tone="teal"
              size="md"
              className="mx-auto"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Active agents</title>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            />
            <CountUp
              to={asesoresCount}
              durationMs={1600}
              className="text-5xl"
              style={{ ...NUMBER_STYLE, color: 'var(--canon-cream)' }}
            />
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              {t('asesoresLabel')}
            </span>
          </Card>

          <Card variant="glow" className="flex flex-col gap-2 p-6 text-center">
            <IconCircle
              tone="violet"
              size="md"
              className="mx-auto"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Founders cohort</title>
                  <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
                </svg>
              }
            />
            <CountUp
              to={foundersRemaining}
              durationMs={1600}
              className="text-5xl"
              style={{ ...NUMBER_STYLE, color: 'var(--canon-cream)' }}
            />
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              {t('foundersLabel')} · {t('foundersOf')}
            </span>
          </Card>
        </StaggerContainer>

        <FadeUp delay={0.2}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span
                className="font-[var(--font-display)] text-lg font-semibold"
                style={{ color: 'var(--canon-cream)' }}
              >
                {t('previewLabel')}
              </span>
              <DisclosurePill tone="amber">{t('disclosureLabel')}</DisclosurePill>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <PreviewMockup
                title={t('preview1Title')}
                caption={t('preview1Caption')}
                iconPath="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"
              />
              <PreviewMockup
                title={t('preview2Title')}
                caption={t('preview2Caption')}
                iconPath="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11zM17 21v-8H7v8M7 3v5h8"
              />
              <PreviewMockup
                title={t('preview3Title')}
                caption={t('preview3Caption')}
                iconPath="M3 3h18v18H3zM3 9h18M9 3v18"
              />
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
