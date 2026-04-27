'use client';

// FASE 14.F.4 Sprint 3 — Listing Health Badge.
// Click abre ListingHealthDrawer. Score 0-100 mapeado a tier canon ADR-050:
// excellent (80-100, green) / good (50-79, amber) / critical (0-49, red).
// Auto-analyze on mount si no existe score en BD aún.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { ListingHealthDrawer } from './ListingHealthDrawer';

export interface ListingHealthBadgeProps {
  readonly importId: string;
}

type Tier = 'excellent' | 'good' | 'critical' | 'pending';

function tierFromScore(score: number): Exclude<Tier, 'pending'> {
  if (score >= 80) return 'excellent';
  if (score >= 50) return 'good';
  return 'critical';
}

const TIER_GRADIENT: Record<Exclude<Tier, 'pending'>, string> = {
  excellent: 'var(--gradient-score-excellent, linear-gradient(90deg, #16A34A, #22C55E))',
  good: 'var(--gradient-score-good, linear-gradient(90deg, #F59E0B, #FBBF24))',
  critical: 'var(--gradient-score-critical, linear-gradient(90deg, #DC2626, #EF4444))',
};

const TIER_BORDER: Record<Exclude<Tier, 'pending'>, string> = {
  excellent: 'rgba(34, 197, 94, 0.45)',
  good: 'rgba(245, 158, 11, 0.45)',
  critical: 'rgba(239, 68, 68, 0.45)',
};

function buttonStyle(tier: Exclude<Tier, 'pending'>): CSSProperties {
  return {
    appearance: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    border: `1px solid ${TIER_BORDER[tier]}`,
    background: TIER_GRADIENT[tier],
    color: '#FFFFFF',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '12.5px',
    letterSpacing: '0.01em',
    fontVariantNumeric: 'tabular-nums',
    transition: 'transform var(--canon-duration-fast) var(--canon-ease-out)',
  };
}

const pendingStyle: CSSProperties = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  borderRadius: 'var(--canon-radius-pill)',
  border: '1px solid var(--canon-border)',
  background: 'var(--surface-recessed)',
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  fontWeight: 500,
};

export function ListingHealthBadge({ importId }: ListingHealthBadgeProps) {
  const t = useTranslations('Studio.listingHealth');
  const [open, setOpen] = useState<boolean>(false);
  const [analyzeAttempted, setAnalyzeAttempted] = useState<boolean>(false);

  const utils = trpc.useUtils();
  const query = trpc.studio.listingHealth.getByUrlImport.useQuery({ importId });
  const analyzeMutation = trpc.studio.listingHealth.analyze.useMutation({
    onSuccess() {
      void utils.studio.listingHealth.getByUrlImport.invalidate({ importId });
    },
  });

  useEffect(() => {
    if (query.isLoading || analyzeAttempted) return;
    if (query.data) return;
    if (!query.isFetched) return;
    setAnalyzeAttempted(true);
    analyzeMutation.mutate({ importId });
  }, [analyzeAttempted, analyzeMutation, importId, query.data, query.isFetched, query.isLoading]);

  if (query.isLoading || (analyzeMutation.isPending && !query.data)) {
    return (
      <span style={pendingStyle} aria-live="polite" data-testid="listing-health-badge-pending">
        {t('loadingLabel')}
      </span>
    );
  }

  const score = query.data?.score_overall ?? null;

  if (score === null) {
    return (
      <span style={pendingStyle} data-testid="listing-health-badge-empty">
        {t('errorLabel')}
      </span>
    );
  }

  const tier = tierFromScore(score);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={buttonStyle(tier)}
        aria-label={t('badgeAriaLabel', { score })}
        data-tier={tier}
        data-testid="listing-health-badge"
      >
        <span aria-hidden="true">●</span>
        <span>{t('badgeLabel', { score })}</span>
      </button>
      <ListingHealthDrawer importId={importId} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
