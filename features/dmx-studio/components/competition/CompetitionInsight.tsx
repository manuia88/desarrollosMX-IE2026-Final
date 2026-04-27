'use client';

// FASE 14.F.4 Sprint 3 — Competition Insight.
// "Tu video destaca con:" + 3 cards distinctiveHooks. Llama Director Claude vía
// trpc.studio.copyPack.competitionAnalysis.useMutation on mount post project
// load. ADR-050 canon: white-pure heading + breath glow + violet AI gradient.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface CompetitionInsightProps {
  readonly projectId: string;
}

const headingStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '22px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  lineHeight: 1.55,
};

const indexStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '12px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--canon-cream-2)',
  fontVariantNumeric: 'tabular-nums',
};

const hookTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '15.5px',
  lineHeight: 1.4,
  color: '#FFFFFF',
  letterSpacing: '-0.005em',
};

const cardOuterStyle: CSSProperties = {
  position: 'relative',
};

const aiOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'var(--canon-radius-card)',
  background:
    'var(--gradient-ai, linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.10), rgba(236,72,153,0.10)))',
  pointerEvents: 'none',
  opacity: 0.5,
};

const similarLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  color: 'var(--canon-cream-2)',
  fontVariantNumeric: 'tabular-nums',
};

const errorStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: '#fca5a5',
};

const skeletonHookStyle: CSSProperties = {
  height: '64px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
};

const SKELETON_KEYS = ['c1', 'c2', 'c3'] as const;

export function CompetitionInsight({ projectId }: CompetitionInsightProps) {
  const t = useTranslations('Studio.competition');
  const mutation = trpc.studio.copyPack.competitionAnalysis.useMutation();
  const [triggered, setTriggered] = useState<boolean>(false);

  useEffect(() => {
    if (triggered) return;
    setTriggered(true);
    mutation.mutate({ projectId });
  }, [mutation, projectId, triggered]);

  const isLoading = mutation.isPending || (!mutation.data && !mutation.isError);
  const hooks = mutation.data?.distinctiveHooks ?? [];
  const similarCount = mutation.data?.similarListingsAssumed ?? 0;

  return (
    <section
      className="flex flex-col gap-4"
      aria-label={t('headingPrimary')}
      data-testid="studio-competition-insight"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 style={headingStyle}>{t('headingPrimary')}</h2>
          <DisclosurePill tone="violet" data-testid="competition-disclosure">
            {t('disclosureLabel')}
          </DisclosurePill>
        </div>
        <p style={subtitleStyle}>{t('subtitle')}</p>
        {!isLoading && !mutation.isError && similarCount > 0 ? (
          <span style={similarLabelStyle}>
            {t('similarListingsLabel', { count: similarCount })}
          </span>
        ) : null}
      </header>

      {mutation.isError ? (
        <p style={errorStyle} data-testid="competition-error">
          {t('errorLabel')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isLoading
          ? SKELETON_KEYS.map((k) => <div key={k} style={skeletonHookStyle} aria-hidden="true" />)
          : hooks.map((hook, i) => (
              <div key={hook} style={cardOuterStyle}>
                <Card variant="glow" hoverable className="relative p-4 flex flex-col gap-2">
                  <span aria-hidden="true" style={aiOverlayStyle} />
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span style={indexStyle}>{t('hookIndexLabel', { n: i + 1 })}</span>
                    <p style={hookTextStyle}>{hook}</p>
                  </div>
                </Card>
              </div>
            ))}
      </div>
    </section>
  );
}
