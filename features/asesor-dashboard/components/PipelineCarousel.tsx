'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useState } from 'react';
import type { DashboardDealRow } from '@/features/asesor-dashboard/lib/dashboard-loader';
import { isDealActive } from '@/features/asesor-dashboard/lib/derive';
import { IconArrowRight, IconMessageSquare, IconPhone } from '@/shared/ui/icons/canon-icons';
import { Button } from '@/shared/ui/primitives/canon/button';
import { Card } from '@/shared/ui/primitives/canon/card';
import { ScorePill } from '@/shared/ui/primitives/canon/score-pill';

const ROTATE_INTERVAL_MS = 8000;

export interface PipelineCarouselProps {
  deals: readonly DashboardDealRow[];
}

function compactCurrency(value: number | null, currency: string | null): string {
  if (value === null) return '—';
  const symbol = currency === 'USD' ? 'US$' : '$';
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1_000)}K`;
  return `${symbol}${value.toFixed(0)}`;
}

export function PipelineCarousel({ deals }: PipelineCarouselProps) {
  const t = useTranslations('AsesorDashboard.pipeline');
  const activeDeals = deals.filter(isDealActive);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || activeDeals.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % activeDeals.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, activeDeals.length]);

  if (activeDeals.length === 0) {
    return (
      <Card
        variant="elevated"
        className="flex min-h-[180px] flex-col items-start justify-center gap-3 p-6"
      >
        <h2
          className="text-[14px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-white-pure)', fontFamily: 'var(--font-body)' }}
        >
          {t('title')}
        </h2>
        <p
          className="text-[14px]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('empty.body')}
        </p>
        <Button variant="ghost" size="sm" type="button" onClick={() => setPaused(true)}>
          {t('empty.cta')} <IconArrowRight size={14} />
        </Button>
      </Card>
    );
  }

  const deal = activeDeals[index];
  if (!deal) return null;

  const cardStyle: CSSProperties = {
    transition:
      'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms ease, box-shadow 220ms ease',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  return (
    <Card
      variant="elevated"
      className="flex flex-col gap-4 p-6 hover:border-[color:rgba(99,102,241,0.40)] hover:shadow-[0_12px_32px_rgba(99,102,241,0.18)]"
      onMouseEnter={(e) => {
        setPaused(true);
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        setPaused(false);
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      style={cardStyle}
    >
      <header className="flex items-center justify-between">
        <h2
          className="text-[14px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-white-pure)', fontFamily: 'var(--font-body)' }}
        >
          {t('title')}
        </h2>
        <span
          className="text-[11px]"
          style={{
            color: 'var(--canon-cream-3)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-body)',
          }}
        >
          {index + 1} / {activeDeals.length}
        </span>
      </header>
      <div className="flex flex-col gap-2">
        <span
          className="text-[20px] font-bold leading-none"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {compactCurrency(deal.amount, deal.currency)}
        </span>
        <span
          className="text-[12px]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('dealRef', { ref: deal.id.slice(0, 8) })}
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        aria-hidden="true"
      >
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${Math.min(100, ((index + 1) / activeDeals.length) * 100)}%`,
            background: 'var(--gradient-score-good)',
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="glass"
          size="sm"
          type="button"
          disabled
          aria-label={t('action.whatsappDisabled')}
        >
          <IconMessageSquare size={14} />
          {t('action.whatsapp')}
        </Button>
        <Button
          variant="glass"
          size="sm"
          type="button"
          disabled
          aria-label={t('action.callDisabled')}
        >
          <IconPhone size={14} />
          {t('action.call')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            if (deal.lead_id) {
              window.location.href = `/${deal.lead_id}`;
            }
          }}
          disabled={!deal.lead_id}
        >
          {t('action.viewDeal')} <IconArrowRight size={14} />
        </Button>
        <ScorePill tier="good" className="ml-auto self-center">
          {t('stage.active')}
        </ScorePill>
      </div>
    </Card>
  );
}
