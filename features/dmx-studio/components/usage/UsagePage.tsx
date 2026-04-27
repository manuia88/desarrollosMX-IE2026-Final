'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Usage page orchestrator (Client Component).
// Layout: header (h1 white-pure) + UsageStatsCard + CostsBreakdown.
// FadeUp wrappers (motion canon ≤ 850ms, prefers-reduced-motion respect via tokens.css).

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { FadeUp } from '@/shared/ui/motion';
import { CostsBreakdown } from './CostsBreakdown';
import { UsageStatsCard } from './UsageStatsCard';

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  lineHeight: 1.55,
  color: 'var(--canon-cream-2)',
  maxWidth: '640px',
};

export function UsagePage() {
  const t = useTranslations('Studio.usage');

  return (
    <>
      <FadeUp delay={0}>
        <header className="flex flex-col gap-2">
          <h1 style={headingStyle}>{t('pageTitle')}</h1>
          <p style={subtitleStyle}>{t('pageSubtitle')}</p>
        </header>
      </FadeUp>

      <FadeUp delay={0.05}>
        <UsageStatsCard testId="usage-stats-card" />
      </FadeUp>

      <FadeUp delay={0.1}>
        <CostsBreakdown testId="costs-breakdown" />
      </FadeUp>
    </>
  );
}
